import { useEffect, useState } from 'react'
import './Sidebar.css'

type LegendKind = 'line' | 'arrow' | 'square' | 'circle' | 'bracket' | 'text'

interface LegendItem {
  id: number
  kind: LegendKind
  color: string
  text: string
}

interface SidebarProps {
  currentMap: string
  onMapChange: (map: string) => void
  showRedCircles: boolean
  onRedToggle: (show: boolean) => void
  showBlueCircles: boolean
  onBlueToggle: (show: boolean) => void
  showBlueRectangle: boolean
  onBlueRectangleToggle: (show: boolean) => void
  circleSize: number
  onCircleSizeChange: (size: number) => void
  drawingTool: 'line' | 'arrow' | 'square' | 'circle' | 'bracket' | 'text' | 'eraser' | 'hand'
  onDrawingToolChange: (tool: 'line' | 'arrow' | 'square' | 'circle' | 'bracket' | 'text' | 'eraser' | 'hand') => void
  lineColor: string
  onLineColorChange: (color: string) => void
  textAnnotationValue: string
  onTextAnnotationValueChange: (value: string) => void
  onClearLines: () => void
  legendItems: LegendItem[]
  onAddLegendItem: (item: Omit<LegendItem, 'id'>) => void
  onRemoveLegendItem: (id: number) => void
  onUpdateLegendItemText: (id: number, text: string) => void
  onReorderLegendItem: (draggedId: number, targetId: number) => void
  showLegend: boolean
  onLegendVisibilityChange: (show: boolean) => void
  zoom: number
  onZoomChange: (zoom: number) => void
  onResetView: () => void
  onCopyScreenshot: () => void
  includeLegendInScreenshot: boolean
  onIncludeLegendInScreenshotChange: (value: boolean) => void
  isCapturingScreenshot: boolean
}

const MAPS = ['Canyon', 'Launchpad', 'Abyss', 'Waterway', 'Quarry', 'Volcano']

const normalizeHexColor = (value: string) => {
  const trimmed = value.trim().replace(/^#/, '').toUpperCase()

  if (/^[0-9A-F]{3}$/.test(trimmed) || /^[0-9A-F]{6}$/.test(trimmed)) {
    return `#${trimmed}`
  }

  return null
}

const HexColorInput = ({
  id,
  value,
  onChange,
  className
}: {
  id: string
  value: string
  onChange: (nextValue: string) => void
  className: string
}) => {
  const [draftValue, setDraftValue] = useState(value)

  useEffect(() => {
    setDraftValue(value)
  }, [value])

  const commitValue = () => {
    const nextValue = normalizeHexColor(draftValue)
    if (nextValue) {
      onChange(nextValue)
      setDraftValue(nextValue)
      return
    }

    setDraftValue(value)
  }

  return (
    <input
      id={id}
      type="text"
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      onBlur={commitValue}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.currentTarget.blur()
        }
      }}
      className={className}
      spellCheck={false}
      inputMode="text"
      maxLength={7}
    />
  )
}

const Sidebar = ({
  currentMap,
  onMapChange,
  showRedCircles,
  onRedToggle,
  showBlueCircles,
  onBlueToggle,
  showBlueRectangle,
  onBlueRectangleToggle,
  circleSize,
  onCircleSizeChange,
  drawingTool,
  onDrawingToolChange,
  lineColor,
  onLineColorChange,
  textAnnotationValue,
  onTextAnnotationValueChange,
  onClearLines,
  legendItems,
  onAddLegendItem,
  onRemoveLegendItem,
  onUpdateLegendItemText,
  onReorderLegendItem,
  showLegend,
  onLegendVisibilityChange,
  zoom,
  onZoomChange,
  onResetView,
  onCopyScreenshot,
  includeLegendInScreenshot,
  onIncludeLegendInScreenshotChange,
  isCapturingScreenshot
}: SidebarProps) => {
  const [isOpen, setIsOpen] = useState(true)
  const [legendKind, setLegendKind] = useState<LegendKind>('line')
  const [legendColor, setLegendColor] = useState('#ffffff')
  const [legendText, setLegendText] = useState('')
  const [draggedLegendId, setDraggedLegendId] = useState<number | null>(null)
  const [dropTargetLegendId, setDropTargetLegendId] = useState<number | null>(null)

  const handleCircleSizeInput = (value: string) => {
    onCircleSizeChange(Number(value))
  }

  const handleAddLegendItem = () => {
    const text = legendText.trim()
    if (!text) {
      return
    }

    onAddLegendItem({
      kind: legendKind,
      color: legendColor,
      text
    })
    setLegendText('')
  }

  const handleLegendDragStart = (id: number) => {
    setDraggedLegendId(id)
  }

  const handleLegendDragEnd = () => {
    setDraggedLegendId(null)
    setDropTargetLegendId(null)
  }

  const handleLegendDrop = (targetId: number) => {
    if (draggedLegendId === null || draggedLegendId === targetId) {
      return
    }

    onReorderLegendItem(draggedLegendId, targetId)
  }

  const copyLegendColorToClipboard = async (color: string) => {
    const normalizedColor = normalizeHexColor(color) ?? color.toUpperCase()

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard API unavailable')
      }

      await navigator.clipboard.writeText(normalizedColor)
    } catch {
      window.prompt('Copy this HEX color:', normalizedColor)
    }
  }

  return (
    <>
      {/* Menu toggle button */}
      <button
        className={`sidebar-toggle ${isOpen ? 'menu-open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? 'Hide menu' : 'Show menu'}
      >
        {isOpen ? '◄' : '►'}
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-content">
          <h2>Strategy</h2>

          {/* Map selector */}
          <div className="menu-section">
            <label htmlFor="map-select">Map:</label>
            <select
              id="map-select"
              value={currentMap}
              onChange={(e) => onMapChange(e.target.value)}
              className="map-select"
            >
              {MAPS.map(map => (
                <option key={map} value={map}>
                  {map}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility toggles */}
          <div className="menu-section">
            <h3>Display</h3>
            <button
              type="button"
              className="clear-lines-button"
              onClick={onCopyScreenshot}
              disabled={isCapturingScreenshot}
            >
              {isCapturingScreenshot ? 'Capturing...' : 'Copy screenshot'}
            </button>
            <label className="toggle-label" title="Include the legend in the screenshot">
              <input
                type="checkbox"
                checked={includeLegendInScreenshot}
                onChange={(e) => onIncludeLegendInScreenshotChange(e.target.checked)}
                aria-label="Include the legend in the screenshot"
              />
              <span className="toggle-text">Include legend in screenshot</span>
            </label>
            <div className="circle-toggles-row">
              <label className="toggle-label dot-toggle" title="Red circles">
                <input
                  type="checkbox"
                  checked={showRedCircles}
                  onChange={(e) => onRedToggle(e.target.checked)}
                  aria-label="Show red circles"
                />
                <span className="circle-indicator red" aria-hidden="true"></span>
              </label>
              <label className="toggle-label dot-toggle" title="Blue circles">
                <input
                  type="checkbox"
                  checked={showBlueCircles}
                  onChange={(e) => onBlueToggle(e.target.checked)}
                  aria-label="Show blue circles"
                />
                <span className="circle-indicator blue" aria-hidden="true"></span>
              </label>
              <label className="toggle-label dot-toggle" title="Blue hatched rectangle">
                <input
                  type="checkbox"
                  checked={showBlueRectangle}
                  onChange={(e) => onBlueRectangleToggle(e.target.checked)}
                  aria-label="Show blue rectangle"
                />
                <span className="rectangle-indicator" aria-hidden="true"></span>
              </label>
            </div>
            <div className="zoom-controls">
              <label htmlFor="circle-size-range">Circle size: {circleSize}px</label>
              <input
                id="circle-size-range"
                type="range"
                min="7"
                max="30"
                step="1"
                value={circleSize}
                onInput={(e) => handleCircleSizeInput((e.target as HTMLInputElement).value)}
                onChange={(e) => handleCircleSizeInput(e.target.value)}
                className="zoom-range"
              />
            </div>
          </div>

          <div className="menu-section">
            <h3>Annotations</h3>
            <div className="tool-group" role="radiogroup" aria-label="Drawing tool">
              <button
                type="button"
                className={`tool-button icon-only ${drawingTool === 'line' ? 'active' : ''}`}
                onClick={() => onDrawingToolChange('line')}
                title="Line"
                aria-label="Line"
              >
                <span className="tool-icon-only" aria-hidden="true">／</span>
              </button>
              <button
                type="button"
                className={`tool-button icon-only ${drawingTool === 'arrow' ? 'active' : ''}`}
                onClick={() => onDrawingToolChange('arrow')}
                title="Arrow"
                aria-label="Arrow"
              >
                <span className="tool-icon-only" aria-hidden="true">➤</span>
              </button>
              <button
                type="button"
                className={`tool-button icon-only ${drawingTool === 'square' ? 'active' : ''}`}
                onClick={() => onDrawingToolChange('square')}
                title="Square"
                aria-label="Square"
              >
                <span className="tool-icon-only" aria-hidden="true">▢</span>
              </button>
              <button
                type="button"
                className={`tool-button icon-only ${drawingTool === 'circle' ? 'active' : ''}`}
                onClick={() => onDrawingToolChange('circle')}
                title="Circle"
                aria-label="Circle"
              >
                <span className="tool-icon-only" aria-hidden="true">◯</span>
              </button>
              <button
                type="button"
                className={`tool-button icon-only ${drawingTool === 'bracket' ? 'active' : ''}`}
                onClick={() => onDrawingToolChange('bracket')}
                title="Bracket"
                aria-label="Bracket"
              >
                <span className="tool-icon-only" aria-hidden="true">][</span>
              </button>
              <button
                type="button"
                className={`tool-button icon-only ${drawingTool === 'text' ? 'active' : ''}`}
                onClick={() => onDrawingToolChange('text')}
                title="Text"
                aria-label="Text"
              >
                <span className="tool-icon-only" aria-hidden="true">T</span>
              </button>
              <button
                type="button"
                className={`tool-button ${drawingTool === 'eraser' ? 'active' : ''}`}
                onClick={() => onDrawingToolChange('eraser')}
              >
                Eraser
              </button>
              <button
                type="button"
                className={`tool-button ${drawingTool === 'hand' ? 'active' : ''}`}
                onClick={() => onDrawingToolChange('hand')}
              >
                Hand
              </button>
            </div>
            <div className="color-picker-row">
              <label htmlFor="line-color-picker">Line color:</label>
              <div className="color-picker-control">
                <input
                  id="line-color-picker"
                  type="color"
                  value={lineColor}
                  onChange={(e) => onLineColorChange(e.target.value)}
                  className="line-color-picker"
                />
                <span
                  className="line-color-swatch"
                  style={{ backgroundColor: lineColor }}
                  aria-hidden="true"
                />
                <HexColorInput
                  id="line-color-hex"
                  value={lineColor}
                  onChange={(nextValue) => onLineColorChange(nextValue)}
                  className="line-color-hex"
                />
              </div>
            </div>
            {drawingTool === 'text' && (
              <>
                <label htmlFor="text-annotation-input">Annotation text:</label>
                <input
                  id="text-annotation-input"
                  type="text"
                  className="legend-text-input"
                  value={textAnnotationValue}
                  onChange={(e) => onTextAnnotationValueChange(e.target.value)}
                  placeholder="e.g. B site"
                  maxLength={80}
                />
              </>
            )}
            <button
              type="button"
              className="clear-lines-button"
              onClick={onClearLines}
            >
              Delete annotations
            </button>
            <div className="zoom-controls">
              <label htmlFor="zoom-range">Zoom: {Math.round(zoom * 100)}%</label>
              <input
                id="zoom-range"
                type="range"
                min="0.6"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => onZoomChange(Number(e.target.value))}
                className="zoom-range"
              />
              <button type="button" className="clear-lines-button" onClick={onResetView}>
                ↺ Reset view
              </button>
            </div>
          </div>

          <div className="menu-section">
            <h3>Legend</h3>
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={showLegend}
                onChange={(e) => onLegendVisibilityChange(e.target.checked)}
              />
              <span className="toggle-text">Show legend</span>
            </label>
            <label htmlFor="legend-kind">Type:</label>
            <select
              id="legend-kind"
              className="map-select"
              value={legendKind}
              onChange={(e) => setLegendKind(e.target.value as LegendKind)}
            >
              <option value="line">Line</option>
              <option value="arrow">Arrow</option>
              <option value="square">Square</option>
              <option value="circle">Circle</option>
              <option value="bracket">Bracket</option>
              <option value="text">Text</option>
            </select>

            <div className="color-picker-row">
              <label htmlFor="legend-color-picker">Color:</label>
              <div className="color-picker-control">
                <input
                  id="legend-color-picker"
                  type="color"
                  value={legendColor}
                  onChange={(e) => setLegendColor(e.target.value)}
                  className="line-color-picker"
                />
                <span
                  className="line-color-swatch"
                  style={{ backgroundColor: legendColor }}
                  aria-hidden="true"
                />
                <HexColorInput
                  id="legend-color-hex"
                  value={legendColor}
                  onChange={(nextValue) => setLegendColor(nextValue)}
                  className="line-color-hex"
                />
              </div>
            </div>

            <label htmlFor="legend-text">Text:</label>
            <input
              id="legend-text"
              type="text"
              className="legend-text-input"
              value={legendText}
              onChange={(e) => setLegendText(e.target.value)}
              placeholder="e.g. B setup"
              maxLength={60}
            />

            <button
              type="button"
              className="clear-lines-button"
              onClick={handleAddLegendItem}
            >
              + Add to legend
            </button>

            {legendItems.length > 0 && (
              <ul className="legend-editor-list">
                {legendItems.map(item => (
                  <li
                    key={item.id}
                    className={`legend-editor-item ${dropTargetLegendId === item.id && draggedLegendId !== item.id ? 'drop-target' : ''}`}
                    onDragOver={(e) => {
                      if (draggedLegendId === null) {
                        return
                      }

                      e.preventDefault()
                      if (draggedLegendId !== item.id) {
                        setDropTargetLegendId(item.id)
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      handleLegendDrop(item.id)
                      setDropTargetLegendId(null)
                    }}
                  >
                    <span
                      className="legend-drag-handle"
                      draggable
                      title="Drag to reorder"
                      onDragStart={() => handleLegendDragStart(item.id)}
                      onDragEnd={handleLegendDragEnd}
                    >
                      ⋮⋮
                    </span>
                    <button
                      type="button"
                      className="legend-editor-chip legend-editor-chip-button"
                      style={{ backgroundColor: item.color }}
                      title={`Copy HEX: ${(normalizeHexColor(item.color) ?? item.color).toUpperCase()}`}
                      aria-label={`Copy ${(normalizeHexColor(item.color) ?? item.color).toUpperCase()} to clipboard`}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => {
                        void copyLegendColorToClipboard(item.color)
                      }}
                    />
                    <span className="legend-editor-kind">
                      {item.kind === 'line' ? 'Line' : item.kind === 'arrow' ? 'Arrow' : item.kind === 'square' ? 'Square' : item.kind === 'circle' ? 'Circle' : item.kind === 'bracket' ? 'Bracket' : 'Text'}
                    </span>
                    <input
                      type="text"
                      className="legend-editor-name-input"
                      value={item.text}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => onUpdateLegendItemText(item.id, e.target.value)}
                      maxLength={60}
                    />
                    <button
                      type="button"
                      className="legend-remove-button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => onRemoveLegendItem(item.id)}
                    >
                      X
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar
