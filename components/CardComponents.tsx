import React from 'react';

interface InfoCardProps {
  title: string;
  value: string | number;
  isHighlight?: boolean;
}

export const InfoCard: React.FC<InfoCardProps> = ({ title, value, isHighlight = false }) => (
  <div className={`p-4 rounded-xl ${isHighlight ? 'bg-primary text-primary-foreground' : 'bg-muted/50 border'}`}>
    <p className={`text-sm font-semibold ${isHighlight ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>{title}</p>
    <p className={`text-xl font-bold ${isHighlight ? 'text-primary-foreground' : 'text-foreground'}`}>{value}</p>
  </div>
);

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  delay?: string;
}

export const SectionCard: React.FC<SectionCardProps> = ({ title, icon, children, delay }) => (
  <div 
    className="bg-card text-card-foreground p-6 rounded-2xl shadow-lg border animate-fade-in-up"
    style={{ animationDelay: delay }}
  >
    <div className="flex items-center mb-4">
      <div className="w-8 h-8 text-primary">{icon}</div>
      <h2 className="text-2xl font-bold text-foreground ml-3">{title}</h2>
    </div>
    {children}
  </div>
);

interface ListCardProps {
    title: string;
    items: string[];
    icon: React.ReactNode;
    itemClassName?: string;
    delay?: string;
}

export const ListCard: React.FC<ListCardProps> = ({ title, items, icon, itemClassName = 'bg-muted/50 text-muted-foreground', delay }) => (
    <SectionCard title={title} icon={icon} delay={delay}>
        <ul className="space-y-2">
            {items.map((item, index) => (
                <li key={index} className={`p-3 rounded-md text-sm font-medium ${itemClassName}`}>
                    {item}
                </li>
            ))}
        </ul>
    </SectionCard>
);