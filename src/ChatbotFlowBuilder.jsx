import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Simple text node component
function TextNode({ data, selected }) {
  return (
    <div style={{
      background: 'white',
      border: selected ? '2px solid #555' : '1px solid #ddd',
      borderRadius: '5px',
      minWidth: '200px',
    }}>
      <div style={{
        background: '#b2f0e3',
        padding: '8px 12px',
        borderBottom: '1px solid #ddd',
        borderRadius: '5px 5px 0 0',
        fontSize: '12px',
        fontWeight: '600',
      }}>
        💬 Send Message
      </div>
      
      <div style={{
        padding: '12px',
        fontSize: '14px',
      }}>
        {data.message || 'Click to edit'}
      </div>

      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ background: '#555', width: '12px', height: '12px' }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ background: '#555', width: '12px', height: '12px' }}
      />
    </div>
  );
}

const nodeTypes = { textNode: TextNode };

export default function App() {
  // Load saved flow from localStorage
  const [nodes, setNodes] = useState(() => {
    const saved = localStorage.getItem('chatbot-flow-nodes');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [edges, setEdges] = useState(() => {
    const saved = localStorage.getItem('chatbot-flow-edges');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [selectedNode, setSelectedNode] = useState(null);
  const [message, setMessage] = useState('');
  const reactFlowWrapper = useRef(null);
  const [rfInstance, setRfInstance] = useState(null);
  
  // Initialize nodeId counter based on existing nodes
  const nodeId = useRef(0);
  
  // Set initial nodeId after first render
  React.useEffect(() => {
    if (nodes.length > 0) {
      // Find the highest node ID
      const maxId = Math.max(...nodes.map(node => parseInt(node.id) || 0));
      nodeId.current = maxId;
    }
  }, []);

  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // Connect nodes - only allow one edge from source
  const onConnect = useCallback(
    (params) => {
      const sourceHasEdge = edges.find(e => e.source === params.source && e.sourceHandle === params.sourceHandle);
      
      if (sourceHasEdge) {
        alert('Only one connection allowed from a source!');
        return;
      }

      setEdges((eds) => addEdge(params, eds));
    },
    [edges]
  );

  // When node is clicked, show settings
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setMessage(node.data.message || '');
  }, []);

  // Click on canvas to deselect
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Drop new node on canvas
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (!rfInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Increment counter and create new node
      nodeId.current = nodeId.current + 1;
      
      const newNode = {
        id: `${nodeId.current}`,
        type,
        position,
        data: { message: 'New message' },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [rfInstance]
  );

  // Start dragging node from panel
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Update message when typing
  const handleMessageChange = (e) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          return {
            ...node,
            data: { ...node.data, message: newMessage },
          };
        }
        return node;
      })
    );
  };

  // Save flow with validation
  const handleSave = () => {
    if (nodes.length === 0) {
      alert('Add some nodes first!');
      return;
    }

    if (nodes.length === 1) {
      // Save to localStorage
      localStorage.setItem('chatbot-flow-nodes', JSON.stringify(nodes));
      localStorage.setItem('chatbot-flow-edges', JSON.stringify(edges));
      alert('Flow saved!');
      return;
    }

    // Check nodes without incoming edges
    const nodesWithoutTarget = nodes.filter(node => {
      return !edges.some(edge => edge.target === node.id);
    });

    if (nodesWithoutTarget.length > 1) {
      alert('Error: Cannot save! More than one node has empty target handles.');
      return;
    }

    // Save to localStorage
    localStorage.setItem('chatbot-flow-nodes', JSON.stringify(nodes));
    localStorage.setItem('chatbot-flow-edges', JSON.stringify(edges));
    alert('Flow saved successfully!');
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        background: '#f5f5f5',
        borderBottom: '1px solid #ddd',
        padding: '10px 20px',
        display: 'flex',
        justifyContent: 'flex-end',
      }}>
        <button
          onClick={handleSave}
          style={{
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Save Changes
        </button>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Canvas */}
        <div style={{ flex: 1 }} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onInit={setRfInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>

        {/* Right panel */}
        <div style={{
          width: '300px',
          background: 'white',
          borderLeft: '1px solid #ddd',
          padding: '20px',
        }}>
          {selectedNode ? (
            // Settings panel
            <div>
              <div style={{
                fontSize: '12px',
                color: '#666',
                marginBottom: '20px',
                paddingBottom: '10px',
                borderBottom: '1px solid #eee',
              }}>
                Message
              </div>
              
              <div style={{ marginBottom: '10px' }}>
                <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '5px' }}>
                  Text
                </label>
                <textarea
                  value={message}
                  onChange={handleMessageChange}
                  placeholder="Enter message text"
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '13px',
                    minHeight: '80px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
          ) : (
            // Nodes panel
            <div>
              <div style={{
                fontSize: '12px',
                color: '#666',
                marginBottom: '20px',
                paddingBottom: '10px',
                borderBottom: '1px solid #eee',
              }}>
                Drag to add nodes
              </div>
              
              <div
                draggable
                onDragStart={(e) => onDragStart(e, 'textNode')}
                style={{
                  border: '2px solid #8b5cf6',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  cursor: 'grab',
                  background: 'white',
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>💬</div>
                <div style={{ fontSize: '13px', color: '#8b5cf6', fontWeight: '500' }}>
                  Message
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}