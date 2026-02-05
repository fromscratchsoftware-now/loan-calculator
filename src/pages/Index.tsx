import React, { useState, useMemo, useEffect } from 'react';

interface AmortizationRow {
  paymentNumber: number;
  paymentDate: string;
  beginningBalance: number;
  scheduledPayment: number;
  extraPayment: number;
  totalPayment: number;
  principal: number;
  interest: number;
  endingBalance: number;
  cumulativeInterest: number;
}

interface CalculationResult {
  originalAmount: number;
  remainingBalance: number;
  monthlyPI: number;
  monthlyTaxes: number;
  monthlyExtra: number;
  totalMonthlyPayment: number;
  totalInterest: number;
  totalPaid: number;
  schedule: AmortizationRow[];
  payoffYears: number;
  payoffRemainingMonths: number;
  payoffDate: string;
  extraPaymentStartFormatted: string;
}

type FrequencyType = 'monthly' | 'annual';

const Index = () => {
  const [originalLoanAmount, setOriginalLoanAmount] = useState<string>('300000');
  const [remainingBalance, setRemainingBalance] = useState<string>('275000');
  const [interestRate, setInterestRate] = useState<string>('6.5');
  const [loanTermYears, setLoanTermYears] = useState<string>('30');
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  const [propertyTaxes, setPropertyTaxes] = useState<string>('3600');
  const [taxFrequency, setTaxFrequency] = useState<FrequencyType>('annual');
  
  const [extraPayment, setExtraPayment] = useState<string>('200');
  const [extraFrequency, setExtraFrequency] = useState<FrequencyType>('monthly');
  const [extraPaymentStartDate, setExtraPaymentStartDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);
  const [contactSubmitted, setContactSubmitted] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const calculateAmortization = (
    principal: number,
    annualRate: number,
    years: number,
    taxAmount: number,
    taxFreq: FrequencyType,
    extraAmount: number,
    extraFreq: FrequencyType,
    loanStartDate: string,
    extraStartDate: string,
    original: number
  ): CalculationResult | null => {
    const monthlyTaxes = taxFreq === 'annual' ? taxAmount / 12 : taxAmount;
    const monthlyExtra = extraFreq === 'annual' ? extraAmount / 12 : extraAmount;

    if (principal <= 0 || annualRate <= 0 || years <= 0) {
      return null;
    }

    const monthlyRate = annualRate / 12;
    const totalPayments = Math.ceil(years * 12);

    const monthlyPI = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / 
                      (Math.pow(1 + monthlyRate, totalPayments) - 1);

    const [startYear, startMonth] = loanStartDate.split('-').map(Number);
    const paymentStartDate = new Date(startYear, startMonth - 1, 1);

    const [extraStartYear, extraStartMonth] = extraStartDate.split('-').map(Number);
    const extraPaymentStart = new Date(extraStartYear, extraStartMonth - 1, 1);

    const schedule: AmortizationRow[] = [];
    let balance = principal;
    let cumulativeInterest = 0;

    let paymentNum = 1;
    while (balance > 0.01 && paymentNum <= totalPayments * 2) {
      const interestPayment = balance * monthlyRate;
      let principalPayment = monthlyPI - interestPayment;
      
      const currentPaymentDate = new Date(paymentStartDate);
      currentPaymentDate.setMonth(currentPaymentDate.getMonth() + paymentNum - 1);
      
      let actualExtra = 0;
      if (currentPaymentDate >= extraPaymentStart && monthlyExtra > 0) {
        actualExtra = monthlyExtra;
      }

      if (principalPayment + actualExtra >= balance) {
        principalPayment = balance;
        actualExtra = 0;
      } else if (principalPayment + actualExtra > balance) {
        actualExtra = balance - principalPayment;
      }

      const endingBalance = Math.max(0, balance - principalPayment - actualExtra);
      cumulativeInterest += interestPayment;

      schedule.push({
        paymentNumber: paymentNum,
        paymentDate: currentPaymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        beginningBalance: balance,
        scheduledPayment: monthlyPI,
        extraPayment: actualExtra,
        totalPayment: monthlyPI + actualExtra,
        principal: principalPayment + actualExtra,
        interest: interestPayment,
        endingBalance: endingBalance,
        cumulativeInterest: cumulativeInterest,
      });

      balance = endingBalance;
      paymentNum++;

      if (balance <= 0) break;
    }

    const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
    const totalPaid = schedule.reduce((sum, row) => sum + row.totalPayment, 0) + (monthlyTaxes * schedule.length);
    const payoffMonths = schedule.length;
    const payoffYears = Math.floor(payoffMonths / 12);
    const payoffRemainingMonths = payoffMonths % 12;

    const payoffDate = new Date(paymentStartDate);
    payoffDate.setMonth(payoffDate.getMonth() + payoffMonths - 1);

    const totalMonthlyPayment = monthlyPI + monthlyTaxes + monthlyExtra;

    return {
      originalAmount: original,
      remainingBalance: principal,
      monthlyPI,
      monthlyTaxes,
      monthlyExtra,
      totalMonthlyPayment,
      totalInterest,
      totalPaid,
      schedule,
      payoffYears,
      payoffRemainingMonths,
      payoffDate: payoffDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      extraPaymentStartFormatted: extraPaymentStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    };
  };

  const calculations = useMemo(() => {
    const original = parseFloat(originalLoanAmount) || 0;
    const principal = parseFloat(remainingBalance) || 0;
    const annualRate = parseFloat(interestRate) / 100 || 0;
    const years = parseFloat(loanTermYears) || 0;
    const taxAmount = parseFloat(propertyTaxes) || 0;
    const extraAmount = parseFloat(extraPayment) || 0;

    return calculateAmortization(
      principal,
      annualRate,
      years,
      taxAmount,
      taxFrequency,
      extraAmount,
      extraFrequency,
      startDate,
      extraPaymentStartDate,
      original
    );
  }, [originalLoanAmount, remainingBalance, interestRate, loanTermYears, startDate, propertyTaxes, taxFrequency, extraPayment, extraFrequency, extraPaymentStartDate]);

  const baselineCalculations = useMemo(() => {
    const extraAmount = parseFloat(extraPayment) || 0;
    if (extraAmount <= 0) return null;

    const original = parseFloat(originalLoanAmount) || 0;
    const principal = parseFloat(remainingBalance) || 0;
    const annualRate = parseFloat(interestRate) / 100 || 0;
    const years = parseFloat(loanTermYears) || 0;
    const taxAmount = parseFloat(propertyTaxes) || 0;

    return calculateAmortization(
      principal,
      annualRate,
      years,
      taxAmount,
      taxFrequency,
      0,
      'monthly',
      startDate,
      extraPaymentStartDate,
      original
    );
  }, [originalLoanAmount, remainingBalance, interestRate, loanTermYears, startDate, propertyTaxes, taxFrequency, extraPayment, extraPaymentStartDate]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleContactSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const company = String(formData.get('company') || '').trim();
    const message = String(formData.get('message') || '').trim();

    const subject = encodeURIComponent(`New inquiry from ${name || 'website visitor'}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nCompany: ${company || '—'}\n\nMessage:\n${message}`
    );

    window.location.href = `mailto:hello@fromscratchsoftware.com?subject=${subject}&body=${body}`;
    setContactSubmitted(true);
    form.reset();
    window.setTimeout(() => setContactSubmitted(false), 8000);
  };

  const FrequencyToggle = ({ 
    value, 
    onChange 
  }: { 
    value: FrequencyType; 
    onChange: (v: FrequencyType) => void;
  }) => (
    <div className="flex rounded-lg overflow-hidden border border-slate-300 text-xs">
      <button
        type="button"
        onClick={() => onChange('monthly')}
        className={`px-2.5 py-1.5 transition-colors ${
          value === 'monthly' 
            ? 'bg-primary-600 text-white' 
            : 'bg-white text-slate-600 hover:bg-slate-50'
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange('annual')}
        className={`px-2.5 py-1.5 transition-colors border-l border-slate-300 ${
          value === 'annual' 
            ? 'bg-primary-600 text-white' 
            : 'bg-white text-slate-600 hover:bg-slate-50'
        }`}
      >
        Annual
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 print:bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 print:shadow-none print:border-b-2 print:border-slate-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 print:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center print:bg-slate-800">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-semibold text-slate-900 print:text-xl">Loan Amortization Calculator developed by fromscratchsoftware.com</h1>
                <p className="text-sm text-slate-500 print:hidden">Calculate your mortgage payments and view the full schedule</p>
              </div>
            </div>
            {calculations && (
              <button
                onClick={handlePrint}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors print:hidden"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Schedule
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-4 print:px-0">
        {/* Instructions Banner - Hidden on print */}
        {showInstructions && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 print:hidden">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-slate-900 mb-2">Welcome to the Loan Amortization Calculator developed by fromscratchsoftware.com (Demo Mode)</h3>
                <p className="text-sm text-slate-700 mb-3">
                  This calculator is pre-filled with demo values to showcase all features. Adjust any values in the left panel to see real-time updates.
                </p>
                <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside">
                  <li><strong>Original vs. Remaining Balance:</strong> See how much you've already paid off</li>
                  <li><strong>Extra Payments:</strong> Currently set to $200/month - watch how it saves interest and time</li>
                  <li><strong>Monthly/Annual Toggle:</strong> Switch between monthly and annual for taxes and extra payments</li>
                  <li><strong>Comparison View:</strong> See the impact of extra payments vs. standard schedule</li>
                  <li><strong>Print Function:</strong> Generate a clean printable version of your schedule</li>
                </ul>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Close instructions"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8 print:block">
          {/* Input Form - Hidden on print, independently scrollable */}
          <div className="lg:w-80 xl:w-96 flex-shrink-0 print:hidden">
            <div className="lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-6">Loan Details</h2>
                
                <div className="space-y-5">
                  {/* Loan Start Date */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Loan Start Date
                    </label>
                    <input
                      type="month"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    />
                  </div>

                  {/* Original Loan Amount */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Original Loan Amount
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={originalLoanAmount}
                        onChange={(e) => setOriginalLoanAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="300,000"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">The initial loan amount when originated</p>
                  </div>

                  {/* Remaining Balance */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Remaining Balance
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={remainingBalance}
                        onChange={(e) => setRemainingBalance(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="300,000"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Current principal balance owed</p>
                  </div>

                  {/* Interest Rate */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Interest Rate (Annual %)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.125"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        className="w-full pl-4 pr-8 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder="6.5"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">%</span>
                    </div>
                  </div>

                  {/* Loan Term */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Loan Term (Years)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="50"
                      value={loanTermYears}
                      onChange={(e) => setLoanTermYears(e.target.value)}
                      className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      placeholder="30"
                    />
                  </div>

                  {/* Property Taxes */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-slate-700">
                        Property Taxes
                      </label>
                      <FrequencyToggle value={taxFrequency} onChange={setTaxFrequency} />
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                      <input
                        type="number"
                        value={propertyTaxes}
                        onChange={(e) => setPropertyTaxes(e.target.value)}
                        className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                        placeholder={taxFrequency === 'annual' ? '3,600' : '300'}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {taxFrequency === 'annual' ? 'Annual' : 'Monthly'} property tax amount
                      {taxFrequency === 'annual' && calculations?.monthlyTaxes && (
                        <span className="text-primary-600"> ({formatCurrency(calculations.monthlyTaxes)}/mo)</span>
                      )}
                    </p>
                  </div>

                  {/* Extra Payment Section */}
                  <div className="border-t border-slate-200 pt-5">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4">Extra Payments</h3>
                    
                    {/* Extra Payment Amount */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Extra Payment Amount
                        </label>
                        <FrequencyToggle value={extraFrequency} onChange={setExtraFrequency} />
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                        <input
                          type="number"
                          value={extraPayment}
                          onChange={(e) => setExtraPayment(e.target.value)}
                          className="w-full pl-8 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                          placeholder="0"
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Additional {extraFrequency === 'annual' ? 'annual' : 'monthly'} principal payment
                        {extraFrequency === 'annual' && calculations?.monthlyExtra && parseFloat(extraPayment) > 0 && (
                          <span className="text-accent-600"> ({formatCurrency(calculations.monthlyExtra)}/mo)</span>
                        )}
                      </p>
                    </div>

                    {/* Extra Payment Start Date */}
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Extra Payment Start Date
                      </label>
                      <input
                        type="month"
                        value={extraPaymentStartDate}
                        onChange={(e) => setExtraPaymentStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        When to begin making extra payments
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results - independently scrollable */}
          <div className="flex-1 min-w-0 space-y-6 print:space-y-4">
            {calculations ? (
              <>
                {/* Print Header - Only visible on print */}
                <div className="hidden print:block mb-6 pb-4 border-b-2 border-slate-300">
                  <h2 className="text-lg font-semibold text-slate-900 mb-3">Loan Summary</h2>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Original Amount:</span>
                      <span className="ml-2 font-medium">{formatCurrency(calculations.originalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Remaining Balance:</span>
                      <span className="ml-2 font-medium">{formatCurrency(calculations.remainingBalance)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Interest Rate:</span>
                      <span className="ml-2 font-medium">{interestRate}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Term:</span>
                      <span className="ml-2 font-medium">{loanTermYears} years</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Monthly P&I:</span>
                      <span className="ml-2 font-medium">{formatCurrency(calculations.monthlyPI)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Monthly Taxes:</span>
                      <span className="ml-2 font-medium">{formatCurrency(calculations.monthlyTaxes)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Extra Payment:</span>
                      <span className="ml-2 font-medium">{formatCurrency(calculations.monthlyExtra)}/mo</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Extra Start:</span>
                      <span className="ml-2 font-medium">{calculations.extraPaymentStartFormatted}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Monthly:</span>
                      <span className="ml-2 font-medium">{formatCurrency(calculations.totalMonthlyPayment)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Total Interest:</span>
                      <span className="ml-2 font-medium">{formatCurrency(calculations.totalInterest)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Payoff Date:</span>
                      <span className="ml-2 font-medium">{calculations.payoffDate}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Payoff Time:</span>
                      <span className="ml-2 font-medium">{calculations.payoffYears}y {calculations.payoffRemainingMonths}m</span>
                    </div>
                  </div>
                </div>

                {/* Loan Overview - Hidden on print */}
                {calculations.originalAmount !== calculations.remainingBalance && (
                  <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-xl border border-primary-200 p-5 print:hidden">
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <p className="text-sm text-slate-600">Original Loan</p>
                        <p className="text-lg font-semibold text-slate-900">{formatCurrency(calculations.originalAmount)}</p>
                      </div>
                      <div className="text-slate-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">Remaining Balance</p>
                        <p className="text-lg font-semibold text-primary-700">{formatCurrency(calculations.remainingBalance)}</p>
                      </div>
                      <div className="ml-auto">
                        <p className="text-sm text-slate-600">Already Paid</p>
                        <p className="text-lg font-semibold text-accent-600">
                          {formatCurrency(calculations.originalAmount - calculations.remainingBalance)}
                          <span className="text-sm font-normal text-slate-500 ml-1">
                            ({((1 - calculations.remainingBalance / calculations.originalAmount) * 100).toFixed(1)}%)
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Extra Payment Comparison - Only show when extra payments are configured */}
                {parseFloat(extraPayment) > 0 && baselineCalculations && (
                  <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 overflow-hidden print:hidden">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Extra Payment Impact</h3>
                          <p className="text-sm text-emerald-100">See how your extra payments accelerate payoff</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="grid sm:grid-cols-3 gap-6 mb-6">
                        <div className="text-center">
                          <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-3">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">Interest Saved</p>
                          <p className="text-2xl font-bold text-emerald-600">
                            {formatCurrency(baselineCalculations.totalInterest - calculations.totalInterest)}
                          </p>
                        </div>

                        <div className="text-center">
                          <div className="inline-flex items-center justify-center w-12 h-12 bg-teal-100 rounded-full mb-3">
                            <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">Time Saved</p>
                          <p className="text-2xl font-bold text-teal-600">
                            {(() => {
                              const monthsSaved = baselineCalculations.schedule.length - calculations.schedule.length;
                              const yearsSaved = Math.floor(monthsSaved / 12);
                              const remainingMonths = monthsSaved % 12;
                              return yearsSaved > 0 
                                ? `${yearsSaved}y ${remainingMonths}m`
                                : `${remainingMonths}m`;
                            })()}
                          </p>
                        </div>

                        <div className="text-center">
                          <div className="inline-flex items-center justify-center w-12 h-12 bg-cyan-100 rounded-full mb-3">
                            <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <p className="text-sm text-slate-600 mb-1">New Payoff Date</p>
                          <p className="text-lg font-bold text-cyan-600">
                            {calculations.payoffDate}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            vs {baselineCalculations.payoffDate}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-emerald-200 pt-6">
                        <h4 className="text-sm font-semibold text-slate-900 mb-4">Side-by-Side Comparison</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Total Interest</span>
                            <div className="flex gap-4">
                              <span className="text-slate-400 line-through">{formatCurrency(baselineCalculations.totalInterest)}</span>
                              <span className="font-semibold text-emerald-700">{formatCurrency(calculations.totalInterest)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Total Cost</span>
                            <div className="flex gap-4">
                              <span className="text-slate-400 line-through">{formatCurrency(baselineCalculations.totalPaid)}</span>
                              <span className="font-semibold text-emerald-700">{formatCurrency(calculations.totalPaid)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Number of Payments</span>
                            <div className="flex gap-4">
                              <span className="text-slate-400 line-through">{baselineCalculations.schedule.length}</span>
                              <span className="font-semibold text-emerald-700">{calculations.schedule.length}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-600">Payoff Time</span>
                            <div className="flex gap-4">
                              <span className="text-slate-400 line-through">
                                {baselineCalculations.payoffYears}y {baselineCalculations.payoffRemainingMonths}m
                              </span>
                              <span className="font-semibold text-emerald-700">
                                {calculations.payoffYears}y {calculations.payoffRemainingMonths}m
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 bg-white/60 rounded-lg p-4 border border-emerald-200">
                        <div className="flex gap-3">
                          <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <p className="text-sm text-slate-700">
                            By making extra payments of <strong className="text-emerald-700">{formatCurrency(calculations.monthlyExtra)}/month</strong>, you'll save <strong className="text-emerald-700">{formatCurrency(baselineCalculations.totalInterest - calculations.totalInterest)}</strong> in interest and pay off your loan <strong className="text-emerald-700">
                            {(() => {
                              const monthsSaved = baselineCalculations.schedule.length - calculations.schedule.length;
                              const yearsSaved = Math.floor(monthsSaved / 12);
                              const remainingMonths = monthsSaved % 12;
                              return yearsSaved > 0 
                                ? `${yearsSaved} years and ${remainingMonths} months`
                                : `${remainingMonths} months`;
                            })()}
                            </strong> earlier.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary Cards - Hidden on print */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <p className="text-sm text-slate-500 mb-1">Monthly P&I</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(calculations.monthlyPI)}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <p className="text-sm text-slate-500 mb-1">Total Monthly</p>
                    <p className="text-2xl font-bold text-primary-600">
                      {formatCurrency(calculations.totalMonthlyPayment)}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">incl. taxes & extra</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <p className="text-sm text-slate-500 mb-1">Total Interest</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {formatCurrency(calculations.totalInterest)}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                    <p className="text-sm text-slate-500 mb-1">Payoff Date</p>
                    <p className="text-xl font-bold text-accent-600">
                      {calculations.payoffDate}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {calculations.payoffYears}y {calculations.payoffRemainingMonths}m
                    </p>
                  </div>
                </div>

                {/* Extra Payment Info Card - Hidden on print */}
                {parseFloat(extraPayment) > 0 && (
                  <div className="bg-gradient-to-r from-accent-50 to-teal-50 rounded-xl border border-accent-200 p-5 print:hidden">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">Extra Payments</h4>
                        <p className="text-sm text-slate-600 mt-1">
                          You're making extra payments of <span className="font-medium text-accent-700">{formatCurrency(calculations.monthlyExtra)}/month</span> starting from <span className="font-medium text-accent-700">{calculations.extraPaymentStartFormatted}</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Cost Breakdown - Hidden on print */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:hidden">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Cost Breakdown</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Principal (Remaining Balance)</span>
                      <span className="font-medium text-slate-900">{formatCurrency(calculations.remainingBalance)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Interest</span>
                      <span className="font-medium text-amber-600">{formatCurrency(calculations.totalInterest)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Total Taxes ({calculations.schedule.length} months)</span>
                      <span className="font-medium text-slate-900">{formatCurrency(calculations.monthlyTaxes * calculations.schedule.length)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                      <span className="font-semibold text-slate-900">Total Cost</span>
                      <span className="font-bold text-xl text-primary-600">{formatCurrency(calculations.totalPaid)}</span>
                    </div>
                  </div>
                  
                  {/* Visual breakdown bar */}
                  <div className="mt-6">
                    <div className="h-4 rounded-full overflow-hidden flex bg-slate-100">
                      <div 
                        className="bg-primary-500 transition-all duration-500"
                        style={{ width: `${(calculations.remainingBalance / calculations.totalPaid) * 100}%` }}
                        title="Principal"
                      />
                      <div 
                        className="bg-amber-400 transition-all duration-500"
                        style={{ width: `${(calculations.totalInterest / calculations.totalPaid) * 100}%` }}
                        title="Interest"
                      />
                      <div 
                        className="bg-slate-400 transition-all duration-500"
                        style={{ width: `${((calculations.monthlyTaxes * calculations.schedule.length) / calculations.totalPaid) * 100}%` }}
                        title="Taxes"
                      />
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-primary-500" />
                        <span className="text-slate-600">Principal</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-amber-400" />
                        <span className="text-slate-600">Interest</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-slate-400" />
                        <span className="text-slate-600">Taxes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Amortization Table */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden print:shadow-none print:border-0 print:rounded-none">
                  <div className="p-6 border-b border-slate-200 flex items-center justify-between print:p-0 print:pb-2 print:border-b-2">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">Amortization Schedule</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {calculations.schedule.length} payments over {calculations.payoffYears} years and {calculations.payoffRemainingMonths} months
                      </p>
                    </div>
                    <button
                      onClick={handlePrint}
                      className="sm:hidden flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors print:hidden"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print
                    </button>
                  </div>
                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto print:max-h-none print:overflow-visible">
                    <table className="w-full text-sm print:text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 print:bg-slate-100 sticky top-0 print:static">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700 print:px-2 print:py-1">#</th>
                          <th className="px-4 py-3 text-left font-semibold text-slate-700 print:px-2 print:py-1">Date</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 print:px-2 print:py-1">Beginning Balance</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 print:px-2 print:py-1">Payment</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 print:px-2 print:py-1">Principal</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 print:px-2 print:py-1">Interest</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 print:px-2 print:py-1">Extra</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 print:px-2 print:py-1">Ending Balance</th>
                          <th className="px-4 py-3 text-right font-semibold text-slate-700 print:px-2 print:py-1">Cumulative Interest</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                        {calculations.schedule.map((row, index) => (
                          <tr 
                            key={row.paymentNumber}
                            className={`hover:bg-slate-50 transition-colors print:hover:bg-transparent ${index % 12 === 11 ? 'bg-primary-50/30 print:bg-slate-50' : ''}`}
                          >
                            <td className="px-4 py-3 text-slate-600 print:px-2 print:py-1">{row.paymentNumber}</td>
                            <td className="px-4 py-3 text-slate-600 print:px-2 print:py-1">{row.paymentDate}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-900 print:px-2 print:py-1">
                              {formatCurrency(row.beginningBalance)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-900 print:px-2 print:py-1">
                              {formatCurrency(row.totalPayment)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-primary-600 print:px-2 print:py-1 print:text-slate-900">
                              {formatCurrency(row.principal)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-amber-600 print:px-2 print:py-1 print:text-slate-900">
                              {formatCurrency(row.interest)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-accent-600 print:px-2 print:py-1 print:text-slate-900">
                              {row.extraPayment > 0 ? formatCurrency(row.extraPayment) : '—'}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-900 print:px-2 print:py-1">
                              {formatCurrency(row.endingBalance)}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-slate-500 print:px-2 print:py-1">
                              {formatCurrency(row.cumulativeInterest)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Print Footer */}
                <div className="hidden print:block mt-8 pt-4 border-t border-slate-300 text-xs text-slate-500">
                  <p>Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="mt-1">This schedule is for informational purposes only. Actual loan terms may vary.</p>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center print:hidden">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Enter Loan Details</h3>
                <p className="text-slate-500">Fill in the loan amount, interest rate, and term to see your amortization schedule.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Contact Section - Hidden on print */}
      <section id="contact" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 print:hidden">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.05fr,1.4fr]">
            <div>
              <p className="text-sm font-semibold tracking-wide text-primary-600 uppercase">Developed by fromscratchsoftware.com</p>
              <h3 className="mt-3 text-2xl font-semibold text-slate-900">Need a tool like this or custom software?</h3>
              <p className="mt-3 text-sm text-slate-600">
                Share a few details and we will follow up with ideas, timelines, and a clear next step.
              </p>
              <div className="mt-4 text-sm text-slate-600 space-y-2">
                <p>
                  Prefer email?{' '}
                  <a className="text-primary-600 hover:text-primary-700 font-medium" href="mailto:hello@fromscratchsoftware.com">
                    hello@fromscratchsoftware.com
                  </a>
                </p>
                <p>
                  Visit:{' '}
                  <a className="text-primary-600 hover:text-primary-700 font-medium" href="https://fromscratchsoftware.com" target="_blank" rel="noreferrer">
                    fromscratchsoftware.com
                  </a>
                </p>
              </div>
            </div>

            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="contact-name">Name</label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="contact-email">Email</label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="contact-company">Company (optional)</label>
                <input
                  id="contact-company"
                  name="company"
                  type="text"
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Company name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="contact-message">What do you want to build?</label>
                <textarea
                  id="contact-message"
                  name="message"
                  rows={4}
                  required
                  className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
                  placeholder="Tell us about your tool, goals, or timeline."
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Contact Us
                </button>
                {contactSubmitted && (
                  <span className="text-sm text-emerald-600">Thanks! Your email draft is ready to send.</span>
                )}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Footer - Hidden on print */}
      <footer className="border-t border-slate-200 mt-12 bg-white print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-sm text-slate-500 text-center">
            This calculator provides estimates for informational purposes only. Actual loan terms may vary. Developed by fromscratchsoftware.com. Need a tool like this or custom software?{' '}
            <a className="text-primary-600 hover:text-primary-700 font-medium" href="#contact">Contact us.</a>
          </p>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 w-12 h-12 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition-all duration-300 flex items-center justify-center z-50 print:hidden hover:scale-110"
          aria-label="Back to top"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Index;

