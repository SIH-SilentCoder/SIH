import { CheckCircle, Circle, Clock } from 'lucide-react';
import {
  FaRegCalendarCheck,
  FaBuilding,
  FaSearch,
  FaCheckCircle,
  FaBalanceScale,
  FaSeedling,
  FaLandmark,
  FaCoins,
  FaClipboardCheck,
} from 'react-icons/fa';
import { PROCUREMENT_STEPS, STATUS_ORDER } from '../../utils/constants';

const STEP_ICONS = {
  booked: <FaRegCalendarCheck className="inline mr-2 text-blue-600 w-4 h-4" />,
  arrived: <FaBuilding className="inline mr-2 text-purple-600 w-4 h-4" />,
  verification: <FaSearch className="inline mr-2 text-amber-600 w-4 h-4" />,
  verified: <FaCheckCircle className="inline mr-2 text-teal-600 w-4 h-4" />,
  procurement_in_progress: <FaBalanceScale className="inline mr-2 text-orange-600 w-4 h-4" />,
  procurement_completed: <FaSeedling className="inline mr-2 text-emerald-600 w-4 h-4" />,
  quality_checking: <FaClipboardCheck className="inline mr-2 text-violet-600 w-4 h-4" />,
  payment_processing: <FaLandmark className="inline mr-2 text-sky-600 w-4 h-4" />,
  payment_completed: <FaCoins className="inline mr-2 text-green-600 w-4 h-4" />,
};

const ProcurementTimeline = ({ status, className = '' }) => {
  const currentStep = STATUS_ORDER.indexOf(status);

  return (
    <div className={`${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Procurement Progress</h3>
      <div className="space-y-0">
        {PROCUREMENT_STEPS.map((step, index) => {
          const stepIndex = STATUS_ORDER.indexOf(step.key);
          const isCompleted = currentStep > stepIndex;
          const isCurrent = currentStep === stepIndex;
          const isPending = currentStep < stepIndex;
          const isLast = index === PROCUREMENT_STEPS.length - 1;

          return (
            <div key={step.key} className="flex gap-3">
              {/* Timeline column */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all
                    ${isCompleted ? 'bg-primary-600 text-white' : ''}
                    ${isCurrent ? 'bg-primary-100 border-2 border-primary-600 text-primary-700' : ''}
                    ${isPending ? 'bg-gray-100 border-2 border-gray-200 text-gray-400' : ''}
                  `}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`w-0.5 h-6 my-1 ${
                      isCompleted ? 'bg-primary-400' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`pb-4 pt-1 flex-1 ${isLast ? '' : ''}`}>
                <p
                  className={`text-sm font-medium flex items-center ${
                    isCompleted ? 'text-primary-700' :
                    isCurrent ? 'text-gray-900' :
                    'text-gray-400'
                  }`}
                >
                  {STEP_ICONS[step.key]}
                  <span>{step.label}</span>
                </p>
                {isCurrent && (
                  <p className="text-xs text-primary-600 font-medium mt-0.5">
                    ● Current stage
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProcurementTimeline;
