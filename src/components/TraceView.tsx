import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { useMemo } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  Panel,
  ReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react'
import { buildTraceNodes, traceCoverage } from '../core/trace'
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
        sourcePosition: 'right',
        targetPosition: 'left',
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
          boxShadow: '0 1px 2px rgba(23,33,27,.06)',
        },
      }
    })
  }, [project])

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
        <ReactFlow nodes={nodes} edges={edges} fitView fitViewOptions={{ padding: 0.16 }} minZoom={0.25} maxZoom={1.5}>
          <Background color="#dfe3dc" gap={24} size={1} />
          <Controls showInteractive={false} />
          <Panel position="bottom-right" className="trace-legend">
            <span><i className="normal-edge" /> supports / defines / verifies</span>
            <span><i className="risk-edge" /> challenges</span>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  )
}

