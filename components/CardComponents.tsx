import React from 'react';

interface InfoCardProps {
  title: string;
  value: string | number;
  isHighlight?: boolean;
}

export const InfoCard: React.FC<InfoCardProps> = ({ title, value, isHighlight = false }) => (
  <div className={`p-4 rounded-lg ${isHighlight ? 'bg-brand-primary text-white' : 'bg-brand-background border'}`}>
    <p className={`text-sm font-semibold ${isHighlight ? 'text-green-100' : 'text-brand-text-secondary'}`}>{title}</p>
    <p className={`text-xl font-bold ${isHighlight ? 'text-white' : 'text-brand-text-primary'}`}>{value}</p>
  </div>
);

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, icon, children }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
    <div className="flex items-center mb-4">
      <div className="w-8 h-8 text-brand-primary">{icon}</div>
      <h2 className="text-2xl font-bold text-brand-text-primary ml-3">{title}</h2>
    </div>
    {children}
  </div>
);

interface ListCardProps {
    title: string;
    items: string[];
    icon: React.ReactNode;
    itemClassName?: string;
}

export const ListCard: React.FC<ListCardProps> = ({ title, items, icon, itemClassName = 'bg-gray-100' }) => (
    <SectionCard title={title} icon={icon}>
        <ul className="space-y-2">
            {items.map((item, index) => (
                <li key={index} className={`p-3 rounded-md text-sm font-medium ${itemClassName}`}>
                    {item}
                </li>
            ))}
        </ul>
    </SectionCard>
);