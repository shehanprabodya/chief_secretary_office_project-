import  { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../shared/Card';

export default function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date(2024, 9, 24));

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = currentDate.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const days = [
    ...Array.from({ length: firstDay }, () => null as number | null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {monthName}
        </h3>
        <div className="flex gap-1">
          <button
            onClick={prevMonth}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
          <div
            key={day}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 h-8"
          >
            {day}
          </div>
        ))}
        {days.map((day, idx) => (
          <div
            key={idx}
            className={`h-8 flex items-center justify-center text-sm rounded ${
              !day
                ? ''
                : day === 24
                ? 'bg-blue-600 text-white font-bold'
                : 'text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>
    </Card>
  );
}