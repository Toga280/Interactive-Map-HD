import { useEffect, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import DraggableCircle from './DraggableCircle'
import DraggableRectangle from './DraggableRectangle'
import Sidebar from './Sidebar'
import CanyonMap from '../assets/Canyon.webp'
import LaunchpadMap from '../assets/Launchpad.webp'
import AbyssMap from '../assets/Abyss.webp'
import WaterwayMap from '../assets/Waterway.webp'
import QuarryMap from '../assets/Quarry.webp'
import VolcanoMap from '../assets/Volcano.webp'
import './StrategyBoard.css'

interface Circle {
  id: number
  x: number
  y: number
  rotation: number
  color: 'red' | 'blue'
}

interface Line {
  id: number
  startX: number
  startY: number
  endX: number
  endY: number
  color: string
  kind: 'line' | 'arrow' | 'square' | 'circle' | 'bracket' | 'text'
  text?: string
}

interface LegendItem {
  id: number
  kind: 'line' | 'arrow' | 'square' | 'circle' | 'bracket' | 'text'
  color: string
  text: string
}

interface RectangleObject {
  x: number
  y: number
  width: number
  height: number
  rotation: number
}

type DrawingTool = 'line' | 'arrow' | 'square' | 'circle' | 'bracket' | 'text' | 'eraser' | 'hand'

const MAPS: { [key: string]: string } = {
  'Canyon': CanyonMap,
  'Launchpad': LaunchpadMap,
  'Abyss': AbyssMap,
  'Waterway': WaterwayMap,
  'Quarry': QuarryMap,
  'Volcano': VolcanoMap
}

const StrategyBoard = () => {
  const boardRef = useRef<HTMLDivElement>(null)
  const [currentMap, setCurrentMap] = useState('Canyon')
  const [showRedCircles, setShowRedCircles] = useState(true)
  const [showBlueCircles, setShowBlueCircles] = useState(true)
  const [showBlueRectangle, setShowBlueRectangle] = useState(true)
  const [circleSize, setCircleSize] = useState(14)
  const [drawingTool, setDrawingTool] = useState<DrawingTool>('hand')
  const [lineStart, setLineStart] = useState<{ x: number, y: number } | null>(null)
  const [draftEnd, setDraftEnd] = useState<{ x: number, y: number } | null>(null)
  const [lineColor, setLineColor] = useState('#ffffff')
  const [textAnnotationValue, setTextAnnotationValue] = useState('Text')
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isPanning, setIsPanning] = useState(false)
  const [draggedLineId, setDraggedLineId] = useState<number | null>(null)
  const panStartRef = useRef({ mouseX: 0, mouseY: 0, panX: 0, panY: 0 })
  const draggedLineStartRef = useRef<{
    pointerX: number
    pointerY: number
    line: Line
  } | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [legendItems, setLegendItems] = useState<LegendItem[]>([])
  const [showLegend, setShowLegend] = useState(true)
  const [includeLegendInScreenshot, setIncludeLegendInScreenshot] = useState(true)
  const [hideLegendForCapture, setHideLegendForCapture] = useState(false)
  const [isCapturingScreenshot, setIsCapturingScreenshot] = useState(false)
  const [blueRectangle, setBlueRectangle] = useState<RectangleObject>({
    x: 52,
    y: 58,
    width: 6,
    height: 4,
    rotation: 0
  })
  const [circles, setCircles] = useState<Circle[]>(() => {
    const initialCircles: Circle[] = []

    // Align 5 red and 5 blue circles face to face at the center of the map.
    const redX = 45
    const blueX = 55
    const rowsY = [42, 46, 50, 54, 58]

    for (let i = 0; i < rowsY.length; i++) {
      initialCircles.push({
        id: i,
        x: redX,
        y: rowsY[i],
        rotation: 0,
        color: 'red'
      })
    }

    for (let i = 0; i < rowsY.length; i++) {
      initialCircles.push({
        id: i + rowsY.length,
        x: blueX,
        y: rowsY[i],
        rotation: 0,
        color: 'blue'
      })
    }

    return initialCircles
  })

  const updateCircle = (id: number, x: number, y: number, rotation: number) => {
    setCircles(circles.map(circle =>
      circle.id === id ? { ...circle, x, y, rotation } : circle
    ))
  }

  const clamp = (value: number, min: number, max: number) => {
    return Math.max(min, Math.min(value, max))
  }

  const getPointerPositionFromClient = (clientX: number, clientY: number) => {
    if (!boardRef.current) {
      return null
    }

    const rect = boardRef.current.getBoundingClientRect()
    const localX = clientX - rect.left
    const localY = clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const worldX = ((localX - centerX - panX) / zoom) + centerX
    const worldY = ((localY - centerY - panY) / zoom) + centerY

    return {
      x: clamp((worldX / rect.width) * 100, 0, 100),
      y: clamp((worldY / rect.height) * 100, 0, 100)
    }
  }

  const getPointerPosition = (event: React.MouseEvent<HTMLDivElement>) => {
    return getPointerPositionFromClient(event.clientX, event.clientY)
  }

  const handleBoardWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!boardRef.current) {
      return
    }

    const rect = boardRef.current.getBoundingClientRect()
    const localX = event.clientX - rect.left
    const localY = event.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const scaleFactor = event.deltaY < 0 ? 1.1 : 0.9
    const nextZoom = clamp(zoom * scaleFactor, 0.6, 3)
    if (nextZoom === zoom) {
      return
    }

    const worldX = ((localX - centerX - panX) / zoom) + centerX
    const worldY = ((localY - centerY - panY) / zoom) + centerY

    const nextPanX = localX - ((worldX - centerX) * nextZoom) - centerX
    const nextPanY = localY - ((worldY - centerY) * nextZoom) - centerY

    setZoom(nextZoom)
    setPanX(nextPanX)
    setPanY(nextPanY)
  }

  const isDrawingTool = drawingTool === 'line' || drawingTool === 'arrow' || drawingTool === 'square' || drawingTool === 'circle' || drawingTool === 'bracket'

  const getBracketGeometry = (startX: number, startY: number, endX: number, endY: number) => {
    const dx = endX - startX
    const dy = endY - startY
    const distance = Math.hypot(dx, dy)

    if (distance < 0.001) {
      return null
    }

    const ux = dx / distance
    const uy = dy / distance
    const nx = -uy
    const ny = ux
    const bracketDepth = Math.max(0.8, Math.min(2.2, distance * 0.3))
    const bracketHalfSize = Math.max(0.8, Math.min(1.8, distance * 0.4))

    return {
      startTopX: startX + nx * bracketHalfSize,
      startTopY: startY + ny * bracketHalfSize,
      startBottomX: startX - nx * bracketHalfSize,
      startBottomY: startY - ny * bracketHalfSize,
      startTopInnerX: startX + nx * bracketHalfSize + ux * bracketDepth,
      startTopInnerY: startY + ny * bracketHalfSize + uy * bracketDepth,
      startBottomInnerX: startX - nx * bracketHalfSize + ux * bracketDepth,
      startBottomInnerY: startY - ny * bracketHalfSize + uy * bracketDepth
    }
  }

  const renderBracket = (
    keyPrefix: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string,
    isPreview: boolean,
    onErase?: (event: React.MouseEvent<SVGGElement>) => void,
    onMouseDown?: (event: React.MouseEvent<SVGGElement>) => void
  ) => {
    const geometry = getBracketGeometry(startX, startY, endX, endY)
    if (!geometry) {
      return null
    }

    return (
      <g
        key={keyPrefix}
        className={`strategy-annotation ${isPreview ? 'preview' : ''}`}
        onClick={onErase}
        onMouseDown={onMouseDown}
      >
        <line
          x1={geometry.startTopX}
          y1={geometry.startTopY}
          x2={geometry.startBottomX}
          y2={geometry.startBottomY}
          className={`strategy-line${isPreview ? ' preview' : ''}`}
          style={{ stroke: color, color }}
        />
        <line
          x1={geometry.startTopX}
          y1={geometry.startTopY}
          x2={geometry.startTopInnerX}
          y2={geometry.startTopInnerY}
          className={`strategy-line${isPreview ? ' preview' : ''}`}
          style={{ stroke: color, color }}
        />
        <line
          x1={geometry.startBottomX}
          y1={geometry.startBottomY}
          x2={geometry.startBottomInnerX}
          y2={geometry.startBottomInnerY}
          className={`strategy-line${isPreview ? ' preview' : ''}`}
          style={{ stroke: color, color }}
        />
      </g>
    )
  }

  const handleBoardMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawingTool || !lineStart) {
      return
    }

    const position = getPointerPosition(event)
    if (!position) {
      return
    }

    setDraftEnd(position)
  }

  const handleAnnotationMouseDown = (event: React.MouseEvent<SVGElement>, line: Line) => {
    if (drawingTool !== 'hand' || event.button !== 0) {
      return
    }

    const pointer = getPointerPositionFromClient(event.clientX, event.clientY)
    if (!pointer) {
      return
    }

    event.preventDefault()
    event.stopPropagation()

    draggedLineStartRef.current = {
      pointerX: pointer.x,
      pointerY: pointer.y,
      line: { ...line }
    }
    setDraggedLineId(line.id)
  }

  const handleBoardMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    const isMiddleButtonPan = event.button === 1
    const isHandToolPan = drawingTool === 'hand' && event.button === 0

    if (!isMiddleButtonPan && !isHandToolPan) {
      return
    }

    if (isMiddleButtonPan) {
      event.preventDefault()
    }

    if (!isMiddleButtonPan && (event.target as HTMLElement).closest('.draggable-circle, .draggable-rectangle')) {
      return
    }

    setIsPanning(true)
    panStartRef.current = {
      mouseX: event.clientX,
      mouseY: event.clientY,
      panX,
      panY
    }
  }

  useEffect(() => {
    if (!isPanning) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const dx = event.clientX - panStartRef.current.mouseX
      const dy = event.clientY - panStartRef.current.mouseY
      setPanX(panStartRef.current.panX + dx)
      setPanY(panStartRef.current.panY + dy)
    }

    const handleMouseUp = () => {
      setIsPanning(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isPanning])

  useEffect(() => {
    if (draggedLineId === null) {
      return
    }

    const handleMouseMove = (event: MouseEvent) => {
      const start = draggedLineStartRef.current
      if (!start) {
        return
      }

      const pointer = getPointerPositionFromClient(event.clientX, event.clientY)
      if (!pointer) {
        return
      }

      const deltaX = pointer.x - start.pointerX
      const deltaY = pointer.y - start.pointerY

      setLines(previous => previous.map(line => {
        if (line.id !== draggedLineId) {
          return line
        }

        // Clamp translation once to keep the annotation shape intact near edges.
        const minAllowedDeltaX = -Math.min(start.line.startX, start.line.endX)
        const maxAllowedDeltaX = 100 - Math.max(start.line.startX, start.line.endX)
        const minAllowedDeltaY = -Math.min(start.line.startY, start.line.endY)
        const maxAllowedDeltaY = 100 - Math.max(start.line.startY, start.line.endY)
        const clampedDeltaX = clamp(deltaX, minAllowedDeltaX, maxAllowedDeltaX)
        const clampedDeltaY = clamp(deltaY, minAllowedDeltaY, maxAllowedDeltaY)

        return {
          ...line,
          startX: start.line.startX + clampedDeltaX,
          startY: start.line.startY + clampedDeltaY,
          endX: start.line.endX + clampedDeltaX,
          endY: start.line.endY + clampedDeltaY
        }
      }))
    }

    const handleMouseUp = () => {
      setDraggedLineId(null)
      draggedLineStartRef.current = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggedLineId, getPointerPositionFromClient])

  const handleBoardClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (drawingTool !== 'text' && !isDrawingTool) {
      return
    }

    if ((event.target as HTMLElement).closest('.draggable-circle, .draggable-rectangle')) {
      return
    }

    const position = getPointerPosition(event)
    if (!position) {
      return
    }

    if (drawingTool === 'text') {
      const text = textAnnotationValue.trim()
      if (!text) {
        return
      }

      const textAnnotation: Line = {
        id: Date.now(),
        startX: position.x,
        startY: position.y,
        endX: position.x,
        endY: position.y,
        color: lineColor,
        kind: 'text',
        text
      }

      setLines(previousLines => [...previousLines, textAnnotation])
      return
    }

    if (!lineStart) {
      setLineStart(position)
      setDraftEnd(position)
      return
    }

    const newLine: Line = {
      id: Date.now(),
      startX: lineStart.x,
      startY: lineStart.y,
      endX: position.x,
      endY: position.y,
      color: lineColor,
      kind: drawingTool
    }

    setLines(previousLines => [...previousLines, newLine])
    setLineStart(null)
    setDraftEnd(null)
  }

  const deleteLine = (lineId: number) => {
    setLines(previousLines => previousLines.filter(line => line.id !== lineId))
  }

  const clearLines = () => {
    setLines([])
    setLineStart(null)
    setDraftEnd(null)
  }

  const addLegendItem = (item: Omit<LegendItem, 'id'>) => {
    setLegendItems(previous => [...previous, { id: Date.now(), ...item }])
  }

  const removeLegendItem = (id: number) => {
    setLegendItems(previous => previous.filter(item => item.id !== id))
  }

  const updateLegendItemText = (id: number, text: string) => {
    setLegendItems(previous => previous.map(item => (
      item.id === id ? { ...item, text } : item
    )))
  }

  const reorderLegendItem = (draggedId: number, targetId: number) => {
    setLegendItems(previous => {
      const fromIndex = previous.findIndex(item => item.id === draggedId)
      const toIndex = previous.findIndex(item => item.id === targetId)
      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return previous
      }

      const next = [...previous]
      const [moved] = next.splice(fromIndex, 1)
      const insertIndex = fromIndex < toIndex ? toIndex - 1 : toIndex
      next.splice(insertIndex, 0, moved)
      return next
    })
  }

  const handleToolChange = (tool: DrawingTool) => {
    setDrawingTool(tool)
    setLineStart(null)
    setDraftEnd(null)
  }

  const handleZoomChange = (nextZoom: number) => {
    setZoom(clamp(nextZoom, 0.6, 3))
  }

  const handleCircleSizeChange = (nextSize: number) => {
    setCircleSize(clamp(nextSize, 7, 30))
  }

  const resetView = () => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  const copyScreenshotToClipboard = async () => {
    if (!boardRef.current || isCapturingScreenshot) {
      return
    }

    const boardRect = boardRef.current.getBoundingClientRect()

    if (!window.ClipboardItem || !navigator.clipboard?.write) {
      window.alert('Image clipboard support is not available in this browser.')
      return
    }

    const shouldHideLegend = !includeLegendInScreenshot

    try {
      setIsCapturingScreenshot(true)

      if (shouldHideLegend) {
        setHideLegendForCapture(true)
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              resolve()
            })
          })
        })
      }

      const canvas = await html2canvas(boardRef.current, {
        backgroundColor: '#000000',
        useCORS: true,
        scale: Math.max(window.devicePixelRatio, 2),
        // Lock capture to the board viewport to avoid fixed-element offset drift.
        x: boardRect.left + window.scrollX,
        y: boardRect.top + window.scrollY,
        width: Math.round(boardRect.width),
        height: Math.round(boardRect.height),
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.clientWidth,
        windowHeight: document.documentElement.clientHeight
      })

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png')
      })

      if (!blob) {
        throw new Error('Capture blob unavailable')
      }

      await navigator.clipboard.write([
        new window.ClipboardItem({ 'image/png': blob })
      ])
      window.alert('Screenshot copied to clipboard.')
    } catch {
      window.alert('Unable to copy the screenshot. Check browser permissions.')
    } finally {
      if (shouldHideLegend) {
        setHideLegendForCapture(false)
      }
      setIsCapturingScreenshot(false)
    }
  }

  const getMapImageUrl = () => {
    return MAPS[currentMap]
  }

  const filteredCircles = circles.filter(circle => {
    if (circle.color === 'red' && !showRedCircles) return false
    if (circle.color === 'blue' && !showBlueCircles) return false
    return true
  })

  const textScaleX = (() => {
    if (!boardRef.current) {
      return 1
    }

    const width = boardRef.current.clientWidth
    const height = boardRef.current.clientHeight
    if (width <= 0 || height <= 0) {
      return 1
    }

    // The SVG layer stretches non-uniformly; compensate X scale so glyphs keep their proportions.
    return clamp(height / width, 0.35, 2.5)
  })()

  return (
    <>
      <Sidebar
        currentMap={currentMap}
        onMapChange={setCurrentMap}
        showRedCircles={showRedCircles}
        onRedToggle={setShowRedCircles}
        showBlueCircles={showBlueCircles}
        onBlueToggle={setShowBlueCircles}
        showBlueRectangle={showBlueRectangle}
        onBlueRectangleToggle={setShowBlueRectangle}
        circleSize={circleSize}
        onCircleSizeChange={handleCircleSizeChange}
        drawingTool={drawingTool}
        onDrawingToolChange={handleToolChange}
        lineColor={lineColor}
        onLineColorChange={setLineColor}
        textAnnotationValue={textAnnotationValue}
        onTextAnnotationValueChange={setTextAnnotationValue}
        onClearLines={clearLines}
        legendItems={legendItems}
        onAddLegendItem={addLegendItem}
        onRemoveLegendItem={removeLegendItem}
        onUpdateLegendItemText={updateLegendItemText}
        onReorderLegendItem={reorderLegendItem}
        showLegend={showLegend}
        onLegendVisibilityChange={setShowLegend}
        zoom={zoom}
        onZoomChange={handleZoomChange}
        onResetView={resetView}
        onCopyScreenshot={copyScreenshotToClipboard}
        includeLegendInScreenshot={includeLegendInScreenshot}
        onIncludeLegendInScreenshotChange={setIncludeLegendInScreenshot}
        isCapturingScreenshot={isCapturingScreenshot}
      />
      
      <div
        className={`strategy-board ${drawingTool === 'eraser' ? 'eraser-mode' : ''} ${drawingTool === 'hand' ? 'hand-mode' : ''} ${isPanning ? 'panning' : ''}`}
        ref={boardRef}
        onClick={handleBoardClick}
        onMouseMove={handleBoardMouseMove}
        onMouseDown={handleBoardMouseDown}
        onAuxClick={(event) => {
          if (event.button === 1) {
            event.preventDefault()
          }
        }}
        onWheel={handleBoardWheel}
      >
        <div
          className="board-content"
          style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}
        >
          <img
            src={getMapImageUrl()}
            alt={currentMap}
            className="map-background"
          />

          <svg className="line-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <marker
                id="arrowhead"
                markerWidth="4.5"
                markerHeight="4.5"
                refX="2.9"
                refY="2.25"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path
                  d="M 0 0 L 0 4.5 L 3.897 2.25 Z"
                  fill="context-stroke"
                  stroke="context-stroke"
                  strokeWidth="0.26"
                  strokeLinejoin="round"
                />
              </marker>
            </defs>

            {lines.map(line => {
              if (line.kind === 'text') {
                return (
                  <g
                    key={line.id}
                    className="strategy-annotation"
                    transform={`translate(${line.startX} ${line.startY})`}
                    onMouseDown={(event) => handleAnnotationMouseDown(event, line)}
                    onClick={(event) => {
                      if (drawingTool === 'eraser') {
                        event.stopPropagation()
                        deleteLine(line.id)
                      }
                    }}
                  >
                    <text
                      x={0}
                      y={0}
                      className="strategy-text"
                      style={{ fill: line.color, color: line.color }}
                      transform={`scale(${textScaleX} 1)`}
                    >
                      {line.text}
                    </text>
                  </g>
                )
              }

              if (line.kind === 'square') {
                const x = Math.min(line.startX, line.endX)
                const y = Math.min(line.startY, line.endY)
                const width = Math.abs(line.endX - line.startX)
                const height = Math.abs(line.endY - line.startY)

                return (
                  <rect
                    key={line.id}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    rx={1.2}
                    ry={1.2}
                    className="strategy-line strategy-square strategy-annotation"
                    style={{ stroke: line.color, color: line.color }}
                    onMouseDown={(event) => handleAnnotationMouseDown(event, line)}
                    onClick={(event) => {
                      if (drawingTool === 'eraser') {
                        event.stopPropagation()
                        deleteLine(line.id)
                      }
                    }}
                  />
                )
              }

              if (line.kind === 'circle') {
                const cx = (line.startX + line.endX) / 2
                const cy = (line.startY + line.endY) / 2
                const rx = Math.abs(line.endX - line.startX) / 2
                const ry = Math.abs(line.endY - line.startY) / 2

                return (
                  <ellipse
                    key={line.id}
                    cx={cx}
                    cy={cy}
                    rx={rx}
                    ry={ry}
                    className="strategy-line strategy-annotation"
                    style={{ stroke: line.color, color: line.color, fill: 'none' }}
                    onMouseDown={(event) => handleAnnotationMouseDown(event, line)}
                    onClick={(event) => {
                      if (drawingTool === 'eraser') {
                        event.stopPropagation()
                        deleteLine(line.id)
                      }
                    }}
                  />
                )
              }

              if (line.kind === 'bracket') {
                return renderBracket(
                  `bracket-${line.id}`,
                  line.startX,
                  line.startY,
                  line.endX,
                  line.endY,
                  line.color,
                  false,
                  (event) => {
                    if (drawingTool === 'eraser') {
                      event.stopPropagation()
                      deleteLine(line.id)
                    }
                  },
                  (event) => handleAnnotationMouseDown(event, line)
                )
              }

              return (
                <line
                  key={line.id}
                  x1={line.startX}
                  y1={line.startY}
                  x2={line.endX}
                  y2={line.endY}
                  className={`strategy-line strategy-annotation${line.kind === 'arrow' ? ' strategy-arrow' : ''}`}
                  style={{ stroke: line.color, color: line.color }}
                  markerEnd={line.kind === 'arrow' ? 'url(#arrowhead)' : undefined}
                  onMouseDown={(event) => handleAnnotationMouseDown(event, line)}
                  onClick={(event) => {
                    if (drawingTool === 'eraser') {
                      event.stopPropagation()
                      deleteLine(line.id)
                    }
                  }}
                />
              )
            })}

            {lineStart && draftEnd && (
              drawingTool === 'square' ? (
                <rect
                  x={Math.min(lineStart.x, draftEnd.x)}
                  y={Math.min(lineStart.y, draftEnd.y)}
                  width={Math.abs(draftEnd.x - lineStart.x)}
                  height={Math.abs(draftEnd.y - lineStart.y)}
                  rx={1.2}
                  ry={1.2}
                  className="strategy-line strategy-square preview strategy-annotation"
                  style={{ stroke: lineColor, color: lineColor }}
                />
              ) : drawingTool === 'circle' ? (
                <ellipse
                  cx={(lineStart.x + draftEnd.x) / 2}
                  cy={(lineStart.y + draftEnd.y) / 2}
                  rx={Math.abs(draftEnd.x - lineStart.x) / 2}
                  ry={Math.abs(draftEnd.y - lineStart.y) / 2}
                  className="strategy-line preview strategy-annotation"
                  style={{ stroke: lineColor, color: lineColor, fill: 'none' }}
                />
              ) : drawingTool === 'bracket' ? (
                renderBracket(
                  'bracket-preview',
                  lineStart.x,
                  lineStart.y,
                  draftEnd.x,
                  draftEnd.y,
                  lineColor,
                  true
                )
              ) : (
                <line
                  x1={lineStart.x}
                  y1={lineStart.y}
                  x2={draftEnd.x}
                  y2={draftEnd.y}
                  className={`strategy-line preview strategy-annotation${drawingTool === 'arrow' ? ' strategy-arrow' : ''}`}
                  style={{ stroke: lineColor, color: lineColor }}
                  markerEnd={drawingTool === 'arrow' ? 'url(#arrowhead)' : undefined}
                />
              )
            )}
          </svg>

          {filteredCircles.map(circle => (
            <DraggableCircle
              key={circle.id}
              id={circle.id}
              x={circle.x}
              y={circle.y}
              rotation={circle.rotation}
              color={circle.color}
              onUpdate={updateCircle}
              boardRef={boardRef}
              zoom={zoom}
              panX={panX}
              panY={panY}
              disabled={false}
              getPointerPositionFromClient={getPointerPositionFromClient}
              circleSize={circleSize}
            />
          ))}

          {showBlueRectangle && (
            <DraggableRectangle
              rectangle={blueRectangle}
              onUpdate={setBlueRectangle}
              boardRef={boardRef}
              disabled={false}
              getPointerPositionFromClient={getPointerPositionFromClient}
            />
          )}
        </div>

        {showLegend && !hideLegendForCapture && legendItems.length > 0 && (
          <div className="legend-box" aria-label="Annotation legend">
            <h4>Legend</h4>
            <ul className="legend-list">
              {legendItems.map(item => (
                <li key={item.id} className="legend-item">
                  <span className="legend-visual" aria-hidden="true">
                    {item.kind === 'line' && (
                      <svg viewBox="0 0 48 12" className="legend-svg">
                        <line x1="3" y1="6" x2="45" y2="6" stroke={item.color} strokeWidth="2.6" strokeLinecap="round" />
                      </svg>
                    )}
                    {item.kind === 'arrow' && (
                      <svg viewBox="0 0 48 12" className="legend-svg">
                        <line x1="3" y1="6" x2="36" y2="6" stroke={item.color} strokeWidth="2.6" strokeLinecap="round" />
                        <path
                          d="M 36 3 L 36 9 L 41.196 6 Z"
                          fill={item.color}
                          stroke={item.color}
                          strokeWidth="0.35"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                    {item.kind === 'square' && (
                      <svg viewBox="0 0 48 12" className="legend-svg">
                        <rect x="12" y="2.5" width="24" height="7" rx="2" ry="2" fill="none" stroke={item.color} strokeWidth="2" />
                      </svg>
                    )}
                    {item.kind === 'circle' && (
                      <svg viewBox="0 0 48 12" className="legend-svg">
                        <circle cx="24" cy="6" r="4.2" fill="none" stroke={item.color} strokeWidth="2" />
                      </svg>
                    )}
                    {item.kind === 'bracket' && (
                      <svg viewBox="0 0 48 12" className="legend-svg">
                        <path d="M 16 2.4 L 16 9.6 L 21 9.6 M 16 2.4 L 21 2.4" fill="none" stroke={item.color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {item.kind === 'text' && (
                      <svg viewBox="0 0 48 12" className="legend-svg">
                        <text x="24" y="8.7" fill={item.color} fontSize="8.6" textAnchor="middle" fontWeight="700">T</text>
                      </svg>
                    )}
                  </span>
                  <span className="legend-text">{item.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  )
}

export default StrategyBoard
