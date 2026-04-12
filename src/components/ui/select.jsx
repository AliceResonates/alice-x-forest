import React from 'react';

export function Select({ value, onValueChange, children }) {
  return <div>{children}</div>;
}
export function SelectTrigger({ children }) { return <div>{children}</div>; }
export function SelectContent({ children }) { return <div>{children}</div>; }
export function SelectItem({ value, children }) { return <div data-value={value}>{children}</div>; }
export function SelectValue() { return null; }

export default Select;
