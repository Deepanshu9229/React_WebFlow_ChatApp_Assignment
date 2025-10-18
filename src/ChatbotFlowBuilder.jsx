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

// Custom node component for text messages
function TextNode({ data, selected }) {
  return (
    <div style={{
      background: 'white',
      border: selected ? '2px solid #000' : '1px solid #ccc',
      borderRadius: '8px',
      minWidth: '220px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    }}>
      {/* Node header */}
      <div style={{
        background: '#fff',
        padding: '10px 14px',
        borderBottom: '1px solid #e5e5e5',
        borderRadius: '8px 8px 0 0',
        fontSize: '11px',
        fontWeight: '600',
        color: '#666',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
      }}>
        <span style={{ fontSize: '14px' }}>💬</span>
        <span>Send Message</span>
      </div>
      
      {/* Node content */}
      <div style={{
        padding: '14px',
        fontSize: '13px',
        color: '#333',
      }}>
        {data.message || 'Click to edit message'}
      </div>

      {/* Left handle - where connections come in */}
      <Handle 
        type="target" 
        position={Position.Left} 
        style={{ 
          background: '#555', 
          width: '10px', 
          height: '10px',
          border: '2px solid white',
        }}
      />
      
      {/* Right handle - where connections go out */}
      <Handle 
        type="source" 
        position={Position.Right} 
        style={{ 
          background: '#555', 
          width: '10px', 
          height: '10px',
          border: '2px solid white',
        }}
      />
    </div>
  );
}

// Register our custom node type
const nodeTypes = { textNode: TextNode };

export default function App() {
  // Try to load previously saved nodes from browser storage
  const [nodes, setNodes] = useState(() => {
    const saved = localStorage.getItem('chatbot-flow-nodes');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Try to load previously saved connections
  const [edges, setEdges] = useState(() => {
    const saved = localStorage.getItem('chatbot-flow-edges');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Track which node is currently selected
  const [selectedNode, setSelectedNode] = useState(null);
  
  // Store the message text being edited
  const [message, setMessage] = useState('');
  
  // Reference to the flow canvas wrapper
  const reactFlowWrapper = useRef(null);
  
  // Store the ReactFlow instance once initialized
  const [rfInstance, setRfInstance] = useState(null);
  
  // Counter for generating unique node IDs
  const nodeId = useRef(0);
  
  // On first load, find the highest existing node ID so we don't duplicate IDs
  React.useEffect(() => {
    if (nodes.length > 0) {
      const maxId = Math.max(...nodes.map(node => parseInt(node.id) || 0));
      nodeId.current = maxId;
    }
  }, []);

  // Handle changes to nodes (like position updates)
  const onNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  // Handle changes to edges (like deletions)
  const onEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  // When user connects two nodes
  const onConnect = useCallback(
    (params) => {
      // Check if source already has a connection (only one allowed per source)
      const sourceHasEdge = edges.find(e => e.source === params.source && e.sourceHandle === params.sourceHandle);
      
      if (sourceHasEdge) {
        alert('A node can only have one outgoing connection');
        return;
      }

      // Add the new connection
      setEdges((eds) => addEdge(params, eds));
    },
    [edges]
  );

  // When user clicks a node, show its settings
  const onNodeClick = useCallback((event, node) => {
    setSelectedNode(node);
    setMessage(node.data.message || '');
  }, []);

  // When user clicks empty canvas, deselect node
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Handle drag over canvas (required for drop to work)
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // When user drops a node onto the canvas
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      if (!rfInstance) return;

      // Get the node type being dragged
      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      // Calculate where to place the node based on drop position
      const position = rfInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Create a new node with a unique ID
      nodeId.current = nodeId.current + 1;
      
      const newNode = {
        id: `${nodeId.current}`,
        type,
        position,
        data: { message: 'Text message' },
      };

      // Add the new node to our list
      setNodes((nds) => nds.concat(newNode));
    },
    [rfInstance]
  );

  // When user starts dragging from the nodes panel
  const onDragStart = (event, nodeType) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // When user types in the message textarea
  const handleMessageChange = (e) => {
    const newMessage = e.target.value;
    setMessage(newMessage);
    
    // Update the node's message in real-time
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

  // Save button click handler
  const handleSave = () => {
    // Can't save an empty flow
    if (nodes.length === 0) {
      alert('Please add at least one node before saving');
      return;
    }

    // Single node flows are always valid
    if (nodes.length === 1) {
      localStorage.setItem('chatbot-flow-nodes', JSON.stringify(nodes));
      localStorage.setItem('chatbot-flow-edges', JSON.stringify(edges));
      alert('Flow saved successfully!');
      return;
    }

    // For multiple nodes, check that at most one node has no incoming connection
    // (That would be the starting node)
    const nodesWithoutTarget = nodes.filter(node => {
      return !edges.some(edge => edge.target === node.id);
    });

    if (nodesWithoutTarget.length > 1) {
      alert('Cannot save flow: Multiple nodes are not connected');
      return;
    }

    // Everything looks good, save to browser storage
    localStorage.setItem('chatbot-flow-nodes', JSON.stringify(nodes));
    localStorage.setItem('chatbot-flow-edges', JSON.stringify(edges));
    alert('Flow saved successfully!');
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: '#fafafa',
    }}>
      {/* Top navigation bar */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e5e5e5',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#333',
        }}>
          Chatbot Flow Builder
        </h1>
        
        <button
          onClick={handleSave}
          style={{
            background: '#000',
            color: 'white',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
        >
          Save Changes
        </button>
      </div>

      {/* Main content area */}
      <div style={{ flex: 1, display: 'flex' }}>
        {/* Flow canvas */}
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
            style={{ background: '#fafafa' }}
          >
            <Background color="#ddd" gap={16} />
            <Controls />
          </ReactFlow>
        </div>

        {/* Right sidebar panel */}
        <div style={{
          width: '320px',
          background: 'white',
          borderLeft: '1px solid #e5e5e5',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {selectedNode ? (
            // Show settings panel when a node is selected
            <div style={{ padding: '20px' }}>
              <div style={{
                fontSize: '11px',
                color: '#999',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '1px solid #f0f0f0',
                fontWeight: '600',
              }}>
                Message Settings
              </div>
              
              <div>
                <label style={{ 
                  fontSize: '13px', 
                  color: '#555', 
                  display: 'block', 
                  marginBottom: '8px',
                  fontWeight: '500',
                }}>
                  Text
                </label>
                <textarea
                  value={message}
                  onChange={handleMessageChange}
                  placeholder="Enter your message here"
                  style={{
                    width: '100%',
                    padding: '10px',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    minHeight: '100px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    color: '#333',
                  }}
                />
              </div>
            </div>
          ) : (
            // Show nodes panel when nothing is selected
            <div style={{ padding: '20px' }}>
              <div style={{
                fontSize: '11px',
                color: '#999',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '20px',
                paddingBottom: '12px',
                borderBottom: '1px solid #f0f0f0',
                fontWeight: '600',
              }}>
                Add Nodes
              </div>
              
              {/* Draggable message node */}
              <div
                draggable
                onDragStart={(e) => onDragStart(e, 'textNode')}
                style={{
                  border: '2px solid #000',
                  borderRadius: '8px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'grab',
                  background: 'white',
                  transition: 'all 0.2s',
                }}
                onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
              >
                <div style={{ fontSize: '28px', marginBottom: '10px' }}>💬</div>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#333', 
                  fontWeight: '600',
                }}>
                  Message
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#999',
                  marginTop: '6px',
                }}>
                  Drag to canvas
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}