import React from 'react';

export function Textarea(props) {
  return <textarea {...props} className={`border px-3 py-2 rounded ${props.className || ''}`} />;
}

export default Textarea;
