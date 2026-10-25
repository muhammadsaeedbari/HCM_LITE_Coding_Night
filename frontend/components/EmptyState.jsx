

function EmptyState({
  title = 'No records found',
  message = 'Records will appear here when available.'
}) {
  return (
    <div className="text-center py-5 px-3">
      <i
        className="bi bi-inbox text-secondary"
        style={{ fontSize: '2.5rem' }}
        aria-hidden="true"
      ></i>
      <h5 className="mt-3 mb-2">{title}</h5>
      <p className="text-secondary mb-0">{message}</p>
    </div>
  );
}

export default EmptyState;
