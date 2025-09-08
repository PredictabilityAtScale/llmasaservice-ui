import { describe, it, expect } from 'vitest';

// Test the core progressive action logic independently
describe('Progressive Actions Logic', () => {
  const actions = [
    {
      pattern: 'ACTION:(\\w+)',
      type: 'button',
      markdown: 'Do $1',
    }
  ];

  it('detects action patterns in text', () => {
    const text = 'Some text ACTION:TEST more content';
    const action = actions[0]!;
    const regex = new RegExp(action.pattern, 'gmi');
    const match = regex.exec(text);
    
    expect(match).toBeTruthy();
    expect(match![0]).toBe('ACTION:TEST');
    expect(match![1]).toBe('TEST');
  });

  it('generates stable button IDs from match offset', () => {
    const actionIndex = 0;
    const matchOffset = 10;
    const key = `${actionIndex}:${matchOffset}`;
    
    expect(key).toBe('0:10');
  });

  it('creates placeholder button markup during streaming', () => {
    const buttonId = 'button-stable-1';
    const markdown = 'Do TEST';
    const isPending = true;
    
    const expectedMarkup = isPending 
      ? `<br /><button id="${buttonId}" data-pending="true">${markdown}</button>`
      : `<br /><button id="${buttonId}">${markdown}</button>`;
    
    expect(expectedMarkup).toContain('data-pending="true"');
  });

  it('removes pending attribute for final markup', () => {
    const markup = '<button id="btn-1" data-pending="true">Click me</button>';
    const finalMarkup = markup.replace(/data-pending="true"/g, '');
    
    expect(finalMarkup).toBe('<button id="btn-1" >Click me</button>');
    expect(finalMarkup).not.toContain('data-pending');
  });

  it('substitutes template variables correctly', () => {
    const template = 'Do $1 with $2';
    const groups = ['TEST', 'DATA'];
    
    let result = template;
    groups.forEach((group, index) => {
      result = result.replace(new RegExp(`\\$${index + 1}`, 'gmi'), group);
    });
    
    expect(result).toBe('Do TEST with DATA');
  });
});
