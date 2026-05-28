import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import './DraggableRectangle.css'

interface RectangleObject {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

interface DraggableRectangleProps {
  rectangle: RectangleObject
  onUpdate: (nextRectangle: RectangleObject) => void
  boardRef: RefObject<HTMLDivElement | null>
  disabled: boolean
  getPointerPositionFromClient: (clientX: number, clientY: number) => { x: number, y: number } | null
}

const MIN_SIZE_PERCENT = 4
const MAX_WIDTH_PERCENT = 45
const MAX_HEIGHT_PERCENT = 45
const WIDTH_HEIGHT_RATIO = 2

const DraggableRectangle = ({
  rectangle,
  onUpdate,
  boardRef,
  disabled,
  getPointerPositionFromClient
}: DraggableRectangleProps) => {
  const rectangleRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isRotating, setIsRotating] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [rotationStartAngle, setRotationStartAngle] = useState(0)
  const [rotationStartRotation, setRotationStartRotation] = useState(0)
  const [resizeStartPointer, setResizeStartPointer] = useState({ x: 0, y: 0 })
  const [resizeStartSize, setResizeStartSize] = useState({ width: rectangle.width, height: rectangle.height })

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!boardRef.current) {
        return
      }

      if (isDragging) {
        const pointer = getPointerPositionFromClient(event.clientX, event.clientY)
        if (!pointer) {
          return
        }

        const halfWidth = rectangle.width / 2
        const halfHeight = rectangle.height / 2
        const nextX = Math.max(halfWidth, Math.min(pointer.x - dragOffset.x, 100 - halfWidth))
        const nextY = Math.max(halfHeight, Math.min(pointer.y - dragOffset.y, 100 - halfHeight))

        onUpdate({ ...rectangle, x: nextX, y: nextY })
        return
      }

      if (isResizing) {
        const pointer = getPointerPositionFromClient(event.clientX, event.clientY)
        if (!pointer) {
          return
        }

        const deltaY = pointer.y - resizeStartPointer.y

        const widthLimit = Math.min(MAX_WIDTH_PERCENT, rectangle.x * 2, (100 - rectangle.x) * 2)
        const heightLimit = Math.min(MAX_HEIGHT_PERCENT, rectangle.y * 2, (100 - rectangle.y) * 2)
        const maxHeightFromWidthLimit = widthLimit / WIDTH_HEIGHT_RATIO
        const effectiveHeightLimit = Math.min(heightLimit, maxHeightFromWidthLimit)

        const nextHeight = Math.max(MIN_SIZE_PERCENT, Math.min(resizeStartSize.height + deltaY, effectiveHeightLimit))
        const nextWidth = nextHeight * WIDTH_HEIGHT_RATIO

        onUpdate({ ...rectangle, width: nextWidth, height: nextHeight })
        return
      }

      if (isRotating && rectangleRef.current) {
        const rectangleRect = rectangleRef.current.getBoundingClientRect()
        const centerX = rectangleRect.left + rectangleRect.width / 2
        const centerY = rectangleRect.top + rectangleRect.height / 2

        const dx = event.clientX - centerX
        const dy = event.clientY - centerY
        const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI)
        const angleDiff = currentAngle - rotationStartAngle

        onUpdate({ ...rectangle, rotation: (rotationStartRotation + angleDiff) % 360 })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsRotating(false)
      setIsResizing(false)
    }

    if (isDragging || isRotating || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [
    boardRef,
    dragOffset.x,
    dragOffset.y,
    getPointerPositionFromClient,
    isDragging,
    isResizing,
    isRotating,
    onUpdate,
    rectangle,
    resizeStartPointer.x,
    resizeStartPointer.y,
    resizeStartSize.height,
    resizeStartSize.width,
    rotationStartAngle,
    rotationStartRotation
  ])

  const handleMouseDown = (event: React.MouseEvent) => {
    if (!boardRef.current || disabled) {
      return
    }

    if (event.button !== 0) {
      return
    }

    const target = event.target as HTMLElement

    if (target.classList.contains('rectangle-rotate-handle')) {
      event.preventDefault()

      if (!rectangleRef.current) {
        return
      }

      const rectangleRect = rectangleRef.current.getBoundingClientRect()
      const centerX = rectangleRect.left + rectangleRect.width / 2
      const centerY = rectangleRect.top + rectangleRect.height / 2
      const dx = event.clientX - centerX
      const dy = event.clientY - centerY
      const initialAngle = Math.atan2(dy, dx) * (180 / Math.PI)

      setRotationStartAngle(initialAngle)
      setRotationStartRotation(rectangle.rotation)
      setIsRotating(true)
      return
    }

    if (target.classList.contains('rectangle-resize-handle')) {
      event.preventDefault()

      const pointer = getPointerPositionFromClient(event.clientX, event.clientY)
      if (!pointer) {
        return
      }

      setResizeStartPointer(pointer)
      setResizeStartSize({ width: rectangle.width, height: rectangle.height })
      setIsResizing(true)
      return
    }

    event.preventDefault()
    const pointer = getPointerPositionFromClient(event.clientX, event.clientY)
    if (!pointer) {
      return
    }

    setDragOffset({
      x: pointer.x - rectangle.x,
      y: pointer.y - rectangle.y
    })
    setIsDragging(true)
  }

  const wrapperWidth = `${rectangle.width}%`
  const wrapperHeight = `${rectangle.height}%`

  return (
    <div
      ref={rectangleRef}
      className={`draggable-rectangle ${isRotating ? 'rotating' : ''} ${isResizing ? 'resizing' : ''}`}
      style={{
        left: `${rectangle.x}%`,
        top: `${rectangle.y}%`,
        width: wrapperWidth,
        height: wrapperHeight,
        transform: `translate(-50%, -50%) rotate(${rectangle.rotation}deg)`
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="rectangle-body" />
      <div className="rectangle-rotate-handle" title="Tourner le rectangle" />
      <div className="rectangle-resize-handle" title="Redimensionner le rectangle" />
    </div>
  )
}

export default DraggableRectangle
