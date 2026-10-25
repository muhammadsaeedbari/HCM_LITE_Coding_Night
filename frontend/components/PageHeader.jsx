

function PageHeader({ title, description, action }) {
  return (
    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
      <div>
        <h2 className="fw-bold mb-1">{title}</h2>
        {description && (
          <p className="text-secondary mb-0">{description}</p>
        )}
      </div>

      {action && <div>{action}</div>}
    </div>
  );
}

export default PageHeader;
