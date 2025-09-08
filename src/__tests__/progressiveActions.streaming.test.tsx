import { describe, it, expect } from 'vitest';

// Test streaming behavior that closely mirrors ChatPanel's useEffect logic
describe('Progressive Actions Streaming Behavior', () => {
  const actions = [
    {
      pattern: 'ACTION:(\\w+)',
      type: 'button',
      markdown: 'Do $1',
    },
    {
      pattern: 'TASK:(\\w+)', 
      type: 'button',
      markdown: 'Execute $1',
    }
  ];

  // Simulate the actual ChatPanel useEffect processing
  const processResponse = (
    response: string, 
    idle: boolean, 
    progressiveActions: boolean,
    actionMatchRegistry: Map<string, string>,
    actionSequence: { current: number }
  ) => {
    let content = response;
    
    actions.forEach((action, actionIndex) => {
      if (action.type === 'button') {
        const regex = new RegExp(action.pattern, 'gmi');
        content = content.replace(regex, (match: string, ...groups: any[]) => {
          const offset = groups[groups.length - 2] || 0;
          const key = `${actionIndex}:${offset}`;
          
          // Get or create stable buttonId
          let buttonId = actionMatchRegistry.get(key);
          if (!buttonId) {
            buttonId = `button-stable-${actionSequence.current++}`;
            actionMatchRegistry.set(key, buttonId);
          }
          
          const markdown = action.markdown?.replace(/\$1/g, groups[0]) || match;
          
          // Progressive logic: pending during streaming, active when idle
          if (progressiveActions && !idle) {
            return `<button id="${buttonId}" data-pending="true">${markdown}</button>`;
          } else {
            return `<button id="${buttonId}">${markdown}</button>`;
          }
        });
      }
    });
    
    return content;
  };

  it('proves incremental rendering: first action appears immediately, second when it arrives', () => {
    const registry = new Map<string, string>();
    const sequence = { current: 0 };
    
    // Chunk 1: Only first action pattern
    const chunk1 = processResponse(
      'Start ACTION:SAVE partial',
      false, // streaming
      true,  // progressive
      registry,
      sequence
    );
    
    expect(chunk1).toContain('button-stable-0');
    expect(chunk1).toContain('data-pending="true"');
    expect(chunk1).toContain('Do SAVE');
    expect(chunk1).not.toContain('TASK:'); // Second action not yet present
    
    // Chunk 2: Both action patterns present  
    const chunk2 = processResponse(
      'Start ACTION:SAVE partial and TASK:DEPLOY more',
      false, // still streaming  
      true,  // progressive
      registry,
      sequence
    );
    
    expect(chunk2).toContain('button-stable-0'); // First button (same ID)
    expect(chunk2).toContain('button-stable-1'); // Second button (new ID)
    expect(chunk2).toContain('Do SAVE');
    expect(chunk2).toContain('Execute DEPLOY');
    // Both should be pending during streaming
    expect((chunk2.match(/data-pending="true"/g) || []).length).toBe(2);
    
    // Final chunk: Complete response, streaming done
    const final = processResponse(
      'Start ACTION:SAVE partial and TASK:DEPLOY more complete',
      true,  // idle (streaming complete)
      true,  // progressive  
      registry,
      sequence
    );
    
    expect(final).toContain('button-stable-0'); // First button stable ID
    expect(final).toContain('button-stable-2'); // Second button gets next available ID
    expect(final).toContain('Do SAVE');
    expect(final).toContain('Execute DEPLOY');
    expect(final).not.toContain('data-pending'); // No pending state when idle
  });

  it('confirms stable IDs across streaming updates', () => {
    const registry = new Map<string, string>();
    const sequence = { current: 0 };
    
    // Process same pattern multiple times (simulating re-renders)
    const result1 = processResponse('ACTION:TEST', false, true, registry, sequence);
    const result2 = processResponse('ACTION:TEST again', false, true, registry, sequence);
    const result3 = processResponse('ACTION:TEST final', true, true, registry, sequence);
    
    // Extract button IDs from each result
    const getId = (html: string) => html.match(/id="([^"]+)"/)?.[1];
    
    const id1 = getId(result1);
    const id2 = getId(result2);  
    const id3 = getId(result3);
    
    expect(id1).toBe(id2);
    expect(id2).toBe(id3);
    expect(id1).toBe('button-stable-0'); // Predictable stable ID
  });

  it('validates progressive vs immediate behavior difference', () => {
    const registry1 = new Map<string, string>();
    const registry2 = new Map<string, string>();
    const sequence1 = { current: 0 };
    const sequence2 = { current: 0 };
    
    const response = 'Text ACTION:EXAMPLE during streaming';
    
    // Progressive mode (during streaming)
    const progressive = processResponse(response, false, true, registry1, sequence1);
    
    // Immediate mode (during streaming)  
    const immediate = processResponse(response, false, false, registry2, sequence2);
    
    // Progressive should have pending attribute
    expect(progressive).toContain('data-pending="true"');
    
    // Immediate should not have pending attribute
    expect(immediate).not.toContain('data-pending');
    
    // Both should have buttons
    expect(progressive).toContain('<button');
    expect(immediate).toContain('<button');
  });

  it('simulates real streaming scenario: action appears mid-response', () => {
    const registry = new Map<string, string>();
    const sequence = { current: 0 };
    
    // Realistic streaming chunks
    const chunks = [
      'Let me help you with that task.',
      'Let me help you with that task. I\'ll need to process',
      'Let me help you with that task. I\'ll need to process this ACTION:ANALYZE the', 
      'Let me help you with that task. I\'ll need to process this ACTION:ANALYZE the data first.',
      'Let me help you with that task. I\'ll need to process this ACTION:ANALYZE the data first. Then TASK:EXPORT results.',
    ];
    
    const results = chunks.map((chunk, i) => ({
      chunk,
      isLast: i === chunks.length - 1,
      processed: processResponse(chunk, i === chunks.length - 1, true, registry, sequence)
    }));
    
    // First 2 chunks: no actions yet
    expect(results[0]!.processed).not.toContain('<button');
    expect(results[1]!.processed).not.toContain('<button');
    
    // Chunk 3: First action appears (as placeholder)
    expect(results[2]!.processed).toContain('Do ANALYZE');
    expect(results[2]!.processed).toContain('data-pending="true"');
    expect(results[2]!.processed).not.toContain('TASK:'); // Second action not yet
    
    // Chunk 4: Still only first action
    expect(results[3]!.processed).toContain('Do ANALYZE');
    expect(results[3]!.processed).toContain('data-pending="true"');
    
    // Chunk 5 (final): Both actions, no pending state
    expect(results[4]!.processed).toContain('Do ANALYZE');
    expect(results[4]!.processed).toContain('Execute EXPORT');
    expect(results[4]!.processed).not.toContain('data-pending'); // Final state
  });
});
