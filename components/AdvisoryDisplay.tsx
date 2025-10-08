import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import type { CropAdvisory } from '../types';
import { InfoCard, SectionCard, ListCard } from './CardComponents';
import { CalendarIcon, DropletIcon, CheckCircleIcon, WarningIcon, MarketIcon, BookIcon, DollarSignIcon, BarChartIcon, TargetIcon } from './IconComponents';

interface AdvisoryDisplayProps {
  advisory: CropAdvisory;
  onReset: () => void;
}

const COLORS = ['#166534', '#15803d', '#16a34a', '#22c55e', '#4ade80', '#86efac', '#14532d', '#16a34a'];

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const ExpenseChart: React.FC<{ breakdown: CropAdvisory['estimated_total_expense_for_user_land']['breakdown'] }> = ({ breakdown }) => {
  const data = Object.entries(breakdown).map(([name, value]) => ({
    name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value,
  })).filter(item => item.value > 0);

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => currencyFormatter.format(value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};


const AdvisoryDisplay: React.FC<AdvisoryDisplayProps> = ({ advisory, onReset }) => {
  const {
    suggested_crop_for_cultivation,
    why,
    time_to_complete_harvest,
    estimated_total_expense_for_user_land,
    irrigation_schedule,
    profitability_projection,
    recommended_marketplaces,
    key_practices_for_success,
    warnings_and_constraints,
    data_gaps_and_assumptions,
  } = advisory;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="text-center p-6 bg-white rounded-xl shadow-lg border border-gray-200">
        <p className="text-lg text-brand-text-secondary">Recommended Crop for Cultivation</p>
        <h1 className="text-5xl font-extrabold text-brand-text-primary tracking-tight my-2">
          {suggested_crop_for_cultivation}
        </h1>
        <button
          onClick={onReset}
          className="mt-4 px-5 py-2 text-sm bg-brand-primary text-white font-semibold rounded-lg hover:bg-brand-primary-light transition"
        >
          Start New Advisory
        </button>
      </div>

      {/* Why This Crop? Section */}
      <SectionCard title="Why This Crop?" icon={<CheckCircleIcon />}>
        <div className="grid md:grid-cols-3 gap-6">
          <InfoCard title="Soil Suitability" value={why.soil_suitability} />
          <InfoCard title="Crop Rotation Benefits" value={why.crop_rotation} />
          <InfoCard title="Market Demand" value={why.market_demand} />
        </div>
      </SectionCard>
      
      {/* Timeline Section */}
       <SectionCard title="Harvest Timeline" icon={<CalendarIcon />}>
          <div className="grid md:grid-cols-2 gap-6">
            <InfoCard title="Duration" value={`${time_to_complete_harvest.duration_days_range} days`} />
            <InfoCard title="Season Window" value={time_to_complete_harvest.season_window} />
          </div>
          <p className="text-sm text-gray-500 mt-4 italic">Note: {time_to_complete_harvest.assumptions}</p>
      </SectionCard>

      {/* Financials Section */}
       <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
            <SectionCard title="Estimated Expenses" icon={<DollarSignIcon />}>
                <div className="text-center mb-4">
                    <p className="text-lg text-brand-text-secondary">Total Estimated Cost</p>
                    <p className="text-4xl font-bold text-brand-text-primary">{currencyFormatter.format(estimated_total_expense_for_user_land.amount)}</p>
                </div>
                 <ExpenseChart breakdown={estimated_total_expense_for_user_land.breakdown} />
                 <p className="text-sm text-gray-500 mt-4 italic">Note: {estimated_total_expense_for_user_land.assumptions}</p>
            </SectionCard>
        </div>
        <div className="lg:col-span-2">
            <SectionCard title="Profitability Projection" icon={<BarChartIcon />}>
                 <div className="space-y-4">
                    <InfoCard title="Expected Yield" value={`${profitability_projection.expected_yield.value_range_per_acre} ${profitability_projection.expected_yield.unit}`} />
                    <InfoCard title="Assumed Farm Gate Price" value={`${currencyFormatter.format(profitability_projection.farm_gate_price.price_per_quintal_assumed)} / quintal`} />
                    <InfoCard title="Gross Revenue" value={profitability_projection.gross_revenue_for_user_land.amount_range} isHighlight={true} />
                    <InfoCard title="Net Profit" value={profitability_projection.net_profit_for_user_land.amount_range} isHighlight={true} />
                    <InfoCard title="Return on Investment (ROI)" value={profitability_projection.roi_percentage_range} isHighlight={true} />
                 </div>
            </SectionCard>
        </div>
       </div>

      {/* Irrigation Section */}
       <SectionCard title="Irrigation Schedule" icon={<DropletIcon />}>
          <div className="grid md:grid-cols-3 gap-6">
            <InfoCard title="Frequency" value={irrigation_schedule.frequency} />
            <InfoCard title="Recommended Method" value={irrigation_schedule.method} />
            <InfoCard title="Seasonal Adjustments" value={irrigation_schedule.seasonal_adjustments} />
          </div>
           <p className="text-sm text-gray-600 bg-green-50 p-3 rounded-md mt-4"><strong>Note:</strong> {irrigation_schedule.notes}</p>
      </SectionCard>

      {/* Guidance Section */}
      <div className="grid lg:grid-cols-2 gap-8">
        <ListCard title="Key Practices for Success" items={key_practices_for_success} icon={<CheckCircleIcon />} itemClassName="text-green-800 bg-green-50" />
        <ListCard title="Warnings & Constraints" items={warnings_and_constraints} icon={<WarningIcon />} itemClassName="text-red-800 bg-red-50" />
      </div>

       {/* Marketplaces Section */}
       <SectionCard title="Recommended Marketplaces" icon={<MarketIcon />}>
          <div className="space-y-4">
             {recommended_marketplaces.map((market, index) => (
               <div key={index} className="p-4 bg-gray-50 rounded-lg border">
                 <h4 className="font-bold text-brand-text-primary">{market.name} <span className="text-sm font-normal text-gray-500 ml-2">({market.type} - {market.region})</span></h4>
                 <p className="text-sm text-brand-text-secondary">{market.why_suitable}</p>
               </div>
             ))}
          </div>
      </SectionCard>

      {/* Assumptions Section */}
      <ListCard title="Data Gaps & Assumptions" items={data_gaps_and_assumptions} icon={<BookIcon />} itemClassName="text-gray-700 bg-gray-100" />
    </div>
  );
};

export default AdvisoryDisplay;