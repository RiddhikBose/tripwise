// Shared box for empty / error states so they all look the same.
export default function Notice({ title, children, action, tone = 'neutral' }) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'error' ? 'alert' : undefined}>
      <p className="notice__title">{title}</p>
      {children && <div className="notice__body">{children}</div>}
      {action && <div className="notice__action">{action}</div>}
    </div>
  );
}
