import React from 'react';

const SummaryCard = ({ label, value, accent, subtitle }) => (
  <div className="summary-card">
    <div className="summary-card-accent" style={{ background: accent }} />
    <div className="summary-card-body">
      <span className="summary-label">{label}</span>
      <strong className="summary-value">{value}</strong>
      <span className="summary-subtitle">{subtitle}</span>
    </div>
  </div>
);

const DashboardSummaryCards = ({ total, pending, inProgress, resolved }) => {
  const cards = [
    {
      label: 'Total Reports',
      value: total,
      subtitle: 'All stray animal submissions',
      accent: 'linear-gradient(135deg, #4FC3F7, #29B6F6)'
    },
    {
      label: 'Pending',
      value: pending,
      subtitle: 'Waiting for first action',
      accent: 'linear-gradient(135deg, #FFB74D, #FB8C00)'
    },
    {
      label: 'In Progress',
      value: inProgress,
      subtitle: 'Municipal teams on the case',
      accent: 'linear-gradient(135deg, #64B5F6, #1E88E5)'
    },
    {
      label: 'Resolved',
      value: resolved,
      subtitle: 'Closed and completed reports',
      accent: 'linear-gradient(135deg, #66BB6A, #2E7D32)'
    }
  ];

  return (
    <div className="summary-grid">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </div>
  );
};

export default DashboardSummaryCards;
