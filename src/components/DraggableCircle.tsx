import { useRef, useState, useEffect } from 'react'
import type { RefObject } from 'react'
import './DraggableCircle.css'

interface DraggableCircleProps {
  id: number
  x: number
  y: number
  rotation: number
  color: 'red' | 'blue'
  onUpdate: (id: number, x: number, y: number, rotation: number) => void
  boardRef: RefObject<HTMLDivElement | null>
  zoom: number
  panX: number
  panY: number
  disabled: boolean
  getPointerPositionFromClient: (clientX: number, clientY: number) => { x: number, y: number } | null
  circleSize: number
}

const DraggableCircle = ({
  id,
  x,
  y,
  rotation,
  color,
  onUpdate,
  boardRef,
  disabled,
  getPointerPositionFromClient,
  circleSize
}: DraggableCircleProps) => {
  const circleRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isRotating, setIsRotating] = useState(false)
  const [rotationStartAngle, setRotationStartAngle] = useState(0)
  const [rotationStartRotation, setRotationStartRotation] = useState(0)
  const [currentX, setCurrentX] = useState(x)
  const [currentY, setCurrentY] = useState(y)
  const [currentRotation, setCurrentRotation] = useState(rotation)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!boardRef.current) return
      
      if (isDragging) {
        const rect = boardRef.current.getBoundingClientRect()
        const pointer = getPointerPositionFromClient(e.clientX, e.clientY)
        if (!pointer) {
          return
        }

        const percentX = pointer.x - dragOffset.x
        const percentY = pointer.y - dragOffset.y

        const radiusXPercent = ((circleSize / 2) / rect.width) * 100
        const radiusYPercent = ((circleSize / 2) / rect.height) * 100
        
        // Limiter entre 0 et 100
        const constrainedX = Math.max(radiusXPercent, Math.min(percentX, 100 - radiusXPercent))
        const constrainedY = Math.max(radiusYPercent, Math.min(percentY, 100 - radiusYPercent))
        
        setCurrentX(constrainedX)
        setCurrentY(constrainedY)
        onUpdate(id, constrainedX, constrainedY, currentRotation)
      } else if (isRotating && circleRef.current) {
        const circleRect = circleRef.current.getBoundingClientRect()
        const circleCenterX = circleRect.left + circleRect.width / 2
        const circleCenterY = circleRect.top + circleRect.height / 2
        
        const dx = e.clientX - circleCenterX
        const dy = e.clientY - circleCenterY
        const currentAngle = Math.atan2(dy, dx) * (180 / Math.PI)
        
        const angleDiff = currentAngle - rotationStartAngle
        const newRotation = (rotationStartRotation + angleDiff) % 360
        
        setCurrentRotation(newRotation)
        onUpdate(id, currentX, currentY, newRotation)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsRotating(false)
    }

    if (isDragging || isRotating) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, isRotating, dragOffset, rotationStartAngle, rotationStartRotation, currentX, currentY, currentRotation, id, onUpdate, boardRef, getPointerPositionFromClient])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!boardRef.current) return
    if (disabled) return
    if (e.button !== 0) return
    
    if ((e.target as HTMLElement).classList.contains('rotate-handle')) {
      e.preventDefault()
      if (circleRef.current) {
        const circleRect = circleRef.current.getBoundingClientRect()
        const circleCenterX = circleRect.left + circleRect.width / 2
        const circleCenterY = circleRect.top + circleRect.height / 2
        
        const dx = e.clientX - circleCenterX
        const dy = e.clientY - circleCenterY
        const initialAngle = Math.atan2(dy, dx) * (180 / Math.PI)
        
        setRotationStartAngle(initialAngle)
        setRotationStartRotation(currentRotation)
        setIsRotating(true)
      }
    } else {
      e.preventDefault()
      const pointer = getPointerPositionFromClient(e.clientX, e.clientY)
      if (!pointer) {
        return
      }

      setDragOffset({
        x: pointer.x - currentX,
        y: pointer.y - currentY
      })
      setIsDragging(true)
    }
  }

  return (
    <div
      ref={circleRef}
      className={`draggable-circle ${color} ${isRotating ? 'rotating' : ''}`}
      style={{
        ['--circle-size' as string]: `${circleSize}px`,
        left: `${currentX}%`,
        top: `${currentY}%`,
        transform: `rotate(${currentRotation}deg)`,
        cursor: disabled ? 'default' : (isDragging ? 'grabbing' : 'grab')
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Cercle principal */}
      <div className="circle-body" />
      
      {/* Angle droit (indication directionnel) */}
      <div className="right-angle" />
      
      {/* Handle de rotation */}
      <div className="rotate-handle" title="Glisse pour tourner" />
    </div>
  )
}

export default DraggableCircle
