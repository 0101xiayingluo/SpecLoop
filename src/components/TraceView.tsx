import { ArrowRight, CheckCircle2, FileText, Quote } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  Panel,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import { buildTraceNodes, traceCoverage, traceNodeDetails } from '../core/trace'
import type { SpecProject, TraceNodeType } from '../core/types'

interface TraceViewProps {
  project: SpecProject
  onOpenReview: () => void
}

const columnOrder: TraceNodeType[] = ['evidence', 'problem', 'decision', 'requirement', 'criterion']
const columnLabel: Record<TraceNodeType, string> = {
  evidence: 'Evidence',
  problem: 'User problem',
  decision: 'Decision',
  requirement: 'Requirement',
  criterion: 'Acceptance',
}
const nodeColor: Record<TraceNodeType, string> = {
  evidence: '#f4f5f2',
  problem: '#fff0dc',
  decision: '#e9f3ff',
  requirement: '#eff7df',
  criterion: '#f8ecff',
}

function truncate(value: string, max = 72): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

export function TraceView({ project, onOpenReview }: TraceViewProps) {
  const coverage = traceCoverage(project)
  const [selectedNodeId, setSelectedNodeId] = useState(project.requirements[0]?.id ?? project.evidence[0]?.id ?? '')
  const details = useMemo(() => traceNodeDetails(project, selectedNodeId), [project, selectedNodeId])
  const nodes = useMemo<Node[]>(() => {
    const traceNodes = buildTraceNodes(project)
    const positions = new Map<TraceNodeType, number>()
    return traceNodes.map((item) => {
      const row = positions.get(item.type) ?? 0
      positions.set(item.type, row + 1)
      return {
        id: item.id,
        position: { x: columnOrder.indexOf(item.type) * 280, y: row * 118 },
        data: { label: truncate(item.label) },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        selected: item.id === selectedNodeId,
        style: {
          width: 220,
          minHeight: 62,
          padding: '12px 14px',
          border: item.status === 'at-risk' ? '1px solid #c24137' : '1px solid #cfd4cc',
          borderRadius: 6,
          background: nodeColor[item.type],
          color: '#1d2420',
          fontSize: 12,
          lineHeight: 1.45,
          textAlign: 'left',
          boxShadow: item.id === selectedNodeId ? '0 0 0 3px rgba(99,126,44,.2)' : '0 1px 2px rgba(23,33,27,.06)',
          cursor: 'pointer',
        },
      }
    })
  }, [project, selectedNodeId])

  const edges = useMemo<Edge[]>(() => project.edges.map((edge) => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.relation,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: edge.relation === 'challenges' ? '#c24137' : '#889189' },
    style: { stroke: edge.relation === 'challenges' ? '#c24137' : '#9aa39b', strokeWidth: edge.relation === 'challenges' ? 2 : 1.3 },
    labelStyle: { fill: '#687169', fontSize: 10 },
    labelBgStyle: { fill: '#f7f8f6', fillOpacity: 0.9 },
  })), [project.edges])

  return (
    <div className="trace-layout">
      <div className="trace-toolbar">
        <div>
          <span className="eyebrow">Traceability graph</span>
          <h1>Evidence to acceptance</h1>
        </div>
        <div className="trace-summary">
          <CheckCircle2 size={17} />
          <div><strong>{coverage.percentage}% coverage</strong><span>{coverage.covered} of {coverage.total} output nodes linked</span></div>
        </div>
        <button className="primary-button" onClick={onOpenReview}>Review package <ArrowRight size={16} /></button>
      </div>
      <div className="trace-column-labels">
        {columnOrder.map((type) => <span key={type}>{columnLabel[type]}</span>)}
      </div>
      <div className="trace-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.16 }}
          minZoom={0.25}
          maxZoom={1.5}
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
        >
          <Background color="#dfe3dc" gap={24} size={1} />
          <Controls showInteractive={false} />
          {details ? (
            <Panel position="top-right" className="trace-inspector">
              <div className="trace-inspector-heading">
                <span>{columnLabel[details.type]}</span>
                {details.status ? <strong className={`status-label ${details.status}`}>{details.status}</strong> : null}
              </div>
              <h2>{details.label}</h2>
              {details.description.split('\n').map((line) => <p key={line}>{line}</p>)}
              <div className="trace-inspector-evidence">
                <span><Quote size={13} /> Source evidence · {details.evidenceIds.length}</span>
                {details.evidenceIds.slice(0, 3).map((id) => {
                  const evidence = project.evidence.find((item) => item.id === id)
                  const source = evidence ? project.sources.find((item) => item.id === evidence.sourceId) : undefined
                  return evidence ? (
                    <blockquote key={id}>
                      {evidence.quote}
                      <cite><FileText size={11} /> {source?.title} · line {evidence.lineStart}</cite>
                    </blockquote>
                  ) : null
                })}
              </div>
            </Panel>
          ) : null}
          <Panel position="bottom-right" className="trace-legend">
            <span><i className="normal-edge" /> supports / defines / verifies</span>
            <span><i className="risk-edge" /> challenges</span>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
}
