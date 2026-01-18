import React, { useEffect, useState, useCallback } from 'react';
import { ReactFlow, Controls, Background, Edge, Node, applyNodeChanges, applyEdgeChanges } from '@xyflow/react';
import { forceSimulation, forceLink, forceManyBody, forceCenter } from 'd3-force';
import '@xyflow/react/dist/style.css';

import { Note as DbNote, Relation as DbRelation } from '../db';
import '../index.css';

interface GraphViewProps {
  notes: DbNote[];
  relations: DbRelation[];
}

const proOptions = { hideAttribution: true };

const GraphView: React.FC<GraphViewProps> = ({ notes, relations }) => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    if (notes.length === 0) return;

    const simulationNodes = notes.map(note => ({ id: note.id }));
    const simulationLinks = relations.map(rel => ({ source: rel.sourceId, target: rel.targetId }));

    const simulation = forceSimulation(simulationNodes as any)
      .force('link', forceLink(simulationLinks).id((d: any) => d.id).distance(250))
      .force('charge', forceManyBody().strength(-800))
      .force('center', forceCenter(300, 300))
      .on('tick', () => {
        setNodes(currentNodes => currentNodes.map(node => {
          const simNode = simulationNodes.find(sn => sn.id === node.id);
          if (simNode) {
            return { ...node, position: { x: (simNode as any).x, y: (simNode as any).y } };
          }
          return node;
        }));
      });

    const initialNodes: Node[] = notes.map((note) => ({
      id: note.id,
      data: { label: note.generatedCaption || (typeof note.content === 'string' ? note.content.substring(0, 50) : `[${note.type}]`) },
      position: { x: 0, y: 0 },
      type: 'default',
    }));

    const initialEdges: Edge[] = relations.map(relation => ({
      id: relation.id,
      source: relation.sourceId,
      target: relation.targetId,
      animated: true,
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);

    return () => {
      simulation.stop();
    };
  }, [notes, relations]);

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [setNodes]
  );
  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [setEdges]
  );

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    const relation = relations.find(r => r.id === edge.id);
    if (relation && relation.reasoning) {
      alert(`Reasoning:\n\n${relation.reasoning}`);
    }
  }, [relations]);

  const onPaneClick = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => ({ ...node, style: { ...node.style, opacity: 1 } }))
    );
    setEdges((eds) =>
      eds.map((edge) => ({ ...edge, style: { ...edge.style, opacity: 1 } }))
    );
  }, [setNodes, setEdges]);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const clickedNodeId = node.id;
    const connectedEdges = relations.filter(r => r.sourceId === clickedNodeId || r.targetId === clickedNodeId);
    const connectedNodeIds = new Set<string>([clickedNodeId]);
    connectedEdges.forEach(edge => {
      connectedNodeIds.add(edge.sourceId);
      connectedNodeIds.add(edge.targetId);
    });

    setNodes(nds => nds.map(n => ({
      ...n,
      style: { ...n.style, opacity: connectedNodeIds.has(n.id) ? 1 : 0.2 },
    })));

    const connectedEdgeIds = new Set(connectedEdges.map(r => r.id));
    setEdges(eds => eds.map(e => ({
      ...e,
      style: { ...e.style, opacity: connectedEdgeIds.has(e.id) ? 1 : 0.2 },
    })));

  }, [relations, setNodes, setEdges]);

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeClick={onEdgeClick}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        proOptions={proOptions}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
};

export default GraphView;

