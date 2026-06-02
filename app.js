/**
 * app.js - Budget Tracker Logic
 * Manages application state, UI rendering, calculations, and local storage.
 */
// ==========================================================================
// Constants & Configuration
// ==========================================================================
const CATEGORIES = {
  expense: [
    { value: 'food', label: 'Food & Dining', class: 'cat-badge-food' },
    { value: 'rent', label: 'Rent & Living', class: 'cat-badge-rent' },
    { value: 'utilities', label: 'Utilities & Bills', class: 'cat-badge-utilities' },
    { value: 'entertainment', label: 'Entertainment', class: 'cat-badge-entertainment' },
    { value: 'transport', label: 'Transportation', class: 'cat-badge-transport' },
    { value: 'shopping', label: 'Shopping', class: 'cat-badge-shopping' },
    { value: 'other', label: 'Other Expenses', class: 'cat-badge-other' }
  ],
  income: [
    { value: 'salary', label: 'Salary', class: 'cat-badge-income' },
    { value: 'side-hustle', label: 'Side Hustle', class: 'cat-badge-income' },
    { value: 'investments', label: 'Investments', class: 'cat-badge-income' },
    { value: 'gifts', label: 'Gifts & Grants', class: 'cat-badge-income' },
    { value: 'other', label: 'Other Income', class: 'cat-badge-income' }
  ]
};
// Default initial state
const DEFAULT_STATE = {
  budget: 2000,
  transactions: [
    {
      id: 'tx-initial-1',
      type: 'income',
      amount: 2500,
      category: 'salary',
      date: getFormattedDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)), // 2 days ago
      description: 'Monthly Salary'
    },
    {
      id: 'tx-initial-2',
      type: 'expense',
      amount: 800,
      category: 'rent',
      date: getFormattedDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)), // 1 day ago
      description: 'Apartment Rental Payment'
    },
    {
      id: 'tx-initial-3',
      type: 'expense',
      amount: 72.50,
      category: 'food',
      date: getFormattedDate(new Date()), // Today
      description: 'Weekly Groceries'
    }
  ]
};
// State Object
let state = {
  budget: DEFAULT_STATE.budget,
  transactions: []
};
// SVG Circle circumference config
const SVG_CIRCLE_RADIUS = 40;
const SVG_CIRCLE_CIRCUMFERENCE = 2 * Math.PI * SVG_CIRCLE_RADIUS; // 251.327
// ==========================================================================
// DOM Elements Cache
// ==========================================================================
const DOM = {
  // Budget Header Input
  baseBudgetInput: document.getElementById('baseBudgetInput'),
  clearDataBtn: document.getElementById('clearDataBtn'),
  // Summary Metrics
  summaryBudget: document.getElementById('summaryBudget'),
  summaryIncome: document.getElementById('summaryIncome'),
  summaryExpenses: document.getElementById('summaryExpenses'),
  summaryBalance: document.getElementById('summaryBalance'),
  incomeCount: document.getElementById('incomeCount'),
  expensesCount: document.getElementById('expensesCount'),
  balanceStatus: document.getElementById('balanceStatus'),
  // Transaction Form Elements
  transactionForm: document.getElementById('transactionForm'),
  typeExpense: document.getElementById('typeExpense'),
  typeIncome: document.getElementById('typeIncome'),
  txAmount: document.getElementById('txAmount'),
  quickPresets: document.getElementById('quickPresets'),
  txCategory: document.getElementById('txCategory'),
  txDate: document.getElementById('txDate'),
  txDescription: document.getElementById('txDescription'),
  btnSubmitText: document.getElementById('btnSubmitText'),
  amountError: document.getElementById('amountError'),
  descError: document.getElementById('descError'),
  // Progress Visualization
  budgetProgressCircle: document.getElementById('budgetProgressCircle'),
  budgetPercentage: document.getElementById('budgetPercentage'),
  progressBudget: document.getElementById('progressBudget'),
  progressExpenses: document.getElementById('progressExpenses'),
  progressRemaining: document.getElementById('progressRemaining'),
  budgetStatusAlert: document.getElementById('budgetStatusAlert'),
  budgetAlertMessage: document.getElementById('budgetAlertMessage'),
  // Ledger Filter & History Elements
  ledgerSearch: document.getElementById('ledgerSearch'),
  ledgerCategoryFilter: document.getElementById('ledgerCategoryFilter'),
  filterButtons: document.querySelectorAll('.filter-btn'),
  transactionList: document.getElementById('transactionList'),
  ledgerEmptyState: document.getElementById('ledgerEmptyState')
};
// Current Ledger Filters State
const activeFilters = {
  type: 'all',
  category: 'all',
  searchQuery: ''
};
// ==========================================================================
// Utility Helpers
// ==========================================================================
// Format date into YYYY-MM-DD
function getFormattedDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
// Format number into localized USD currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}
// Generate category badge details helper
function getCategoryInfo(type, val) {
  const categoryPool = CATEGORIES[type] || [];
  return categoryPool.find(c => c.value === val) || { label: val, class: 'cat-badge-other' };
}
// ==========================================================================
// Storage Operations
// ==========================================================================
function saveToLocalStorage() {
  localStorage.setItem('kols_budget_state', JSON.stringify(state));
}
function loadFromLocalStorage() {
  const saved = localStorage.getItem('kols_budget_state');
  if (saved) {
    try {
      state = JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved state, loading defaults.', e);
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    }
  } else {
    // Clone DEFAULT_STATE so edits don't mutate template
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    saveToLocalStorage();
  }
}
// ==========================================================================
// Category Options Rendering
// ==========================================================================
function populateCategoryDropdown(type) {
  DOM.txCategory.innerHTML = '';
  const pool = CATEGORIES[type] || [];
  
  pool.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.value;
    opt.textContent = cat.label;
    DOM.txCategory.appendChild(opt);
  });
  // Also populate the global Ledger category filter
  populateLedgerCategoryFilter();
}
function populateLedgerCategoryFilter() {
  const currentVal = DOM.ledgerCategoryFilter.value;
  DOM.ledgerCategoryFilter.innerHTML = '<option value="all">All Categories</option>';
  
  // Combine all categories uniquely
  const allCats = [...CATEGORIES.expense, ...CATEGORIES.income];
  const uniqueCats = [];
  const map = new Map();
  
  for (const item of allCats) {
    if (!map.has(item.value)) {
      map.set(item.value, true);
      uniqueCats.push(item);
    }
  }
  uniqueCats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat.value;
    opt.textContent = cat.label;
    DOM.ledgerCategoryFilter.appendChild(opt);
  });
  // Preserve previous selection if it is still valid
  if (currentVal && Array.from(DOM.ledgerCategoryFilter.options).some(o => o.value === currentVal)) {
    DOM.ledgerCategoryFilter.value = currentVal;
  }
}
// ==========================================================================
// State Calculations & DOM Renders
// ==========================================================================
function updateDashboard() {
  // 1. Calculations
  const budgetLimit = state.budget;
  
  let incomeSum = 0;
  let incomeCountVal = 0;
  let expensesSum = 0;
  let expensesCountVal = 0;
  state.transactions.forEach(tx => {
    if (tx.type === 'income') {
      incomeSum += tx.amount;
      incomeCountVal++;
    } else if (tx.type === 'expense') {
      expensesSum += tx.amount;
      expensesCountVal++;
    }
  });
  const netBalance = budgetLimit + incomeSum - expensesSum;
  
  // Budget utilization (expenses compared directly to the Allocated budget Cap)
  const utilizationPercent = budgetLimit > 0 ? (expensesSum / budgetLimit) * 100 : 0;
  const remainingRoom = budgetLimit - expensesSum;
  // 2. Render Text Summaries
  DOM.summaryBudget.textContent = formatCurrency(budgetLimit);
  DOM.progressBudget.textContent = formatCurrency(budgetLimit);
  DOM.summaryIncome.textContent = formatCurrency(incomeSum);
  DOM.incomeCount.textContent = `${incomeCountVal} transactions`;
  DOM.summaryExpenses.textContent = formatCurrency(expensesSum);
  DOM.expensesCount.textContent = `${expensesCountVal} transactions`;
  DOM.progressExpenses.textContent = formatCurrency(expensesSum);
  DOM.summaryBalance.textContent = formatCurrency(netBalance);
  
  // Design adaptation for net balance value
  if (netBalance < 0) {
    DOM.summaryBalance.className = 'card-value text-danger';
    DOM.balanceStatus.textContent = 'Net balance is in deficit';
  } else if (netBalance > budgetLimit) {
    DOM.summaryBalance.className = 'card-value text-success';
    DOM.balanceStatus.textContent = 'Surplus balance threshold';
  } else {
    DOM.summaryBalance.className = 'card-value';
    DOM.balanceStatus.textContent = 'Calculated in real-time';
  }
  // 3. Render Remaining Room & Styling
  DOM.progressRemaining.textContent = formatCurrency(remainingRoom);
  if (remainingRoom < 0) {
    DOM.progressRemaining.className = 'text-danger';
  } else {
    DOM.progressRemaining.className = 'text-success';
  }
  // 4. Render Radial Circular Progress Indicator
  const displayPercent = Math.round(utilizationPercent);
  DOM.budgetPercentage.textContent = `${displayPercent}%`;
  // Cap animation logic at 100% so progress path doesn't overlap/reverse
  const animatedPercent = Math.min(utilizationPercent, 100);
  const strokeOffset = SVG_CIRCLE_CIRCUMFERENCE - (animatedPercent / 100) * SVG_CIRCLE_CIRCUMFERENCE;
  
  DOM.budgetProgressCircle.style.strokeDashoffset = strokeOffset;
  // 5. Progress color status & Dynamic Alerts
  DOM.budgetStatusAlert.className = 'progress-status-box';
  
  if (utilizationPercent < 60) {
    DOM.budgetProgressCircle.style.stroke = 'var(--color-success)';
    DOM.budgetAlertMessage.textContent = 'Allocations are stable. You have plenty of budget remaining.';
  } else if (utilizationPercent >= 60 && utilizationPercent <= 85) {
    DOM.budgetProgressCircle.style.stroke = 'var(--color-warning)';
    DOM.budgetStatusAlert.classList.add('status-warn');
    DOM.budgetAlertMessage.textContent = `Aesthetic Warning: Used ${displayPercent}% of your budget limit. Monitor unnecessary outlays.`;
  } else {
    DOM.budgetProgressCircle.style.stroke = 'var(--color-danger)';
    DOM.budgetStatusAlert.classList.add('status-danger');
    if (utilizationPercent > 100) {
      DOM.budgetAlertMessage.textContent = `CRITICAL LIMIT: Budget overdrawn by ${displayPercent - 100}%! Reduce immediate spending.`;
    } else {
      DOM.budgetAlertMessage.textContent = `Caution: Critically close to spending limit. ${displayPercent}% utilized.`;
    }
  }
  // 6. Build History List
  renderLedgerList();
}
// Render filtered transactions list
function renderLedgerList() {
  DOM.transactionList.innerHTML = '';
  
  // Filter state list
  const filtered = state.transactions.filter(tx => {
    // 1. Type Filter
    if (activeFilters.type !== 'all' && tx.type !== activeFilters.type) {
      return false;
    }
    
    // 2. Category Filter
    if (activeFilters.category !== 'all' && tx.category !== activeFilters.category) {
      return false;
    }
    // 3. Search Filter (Matches category name or description)
    if (activeFilters.searchQuery) {
      const q = activeFilters.searchQuery.toLowerCase();
      const descMatch = tx.description.toLowerCase().includes(q);
      const catInfo = getCategoryInfo(tx.type, tx.category);
      const catMatch = catInfo.label.toLowerCase().includes(q);
      return descMatch || catMatch;
    }
    return true;
  });
  // Sort: Newest transaction first
  filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  // Toggle Empty State view if no matches found
  if (filtered.length === 0) {
    DOM.ledgerEmptyState.style.display = 'flex';
    DOM.transactionList.style.display = 'none';
  } else {
    DOM.ledgerEmptyState.style.display = 'none';
    DOM.transactionList.style.display = 'flex';
    filtered.forEach(tx => {
      const li = document.createElement('li');
      li.className = 'ledger-item';
      li.dataset.id = tx.id;
      
      const catInfo = getCategoryInfo(tx.type, tx.category);
      const isIncome = tx.type === 'income';
      const displayAmount = (isIncome ? '+' : '-') + formatCurrency(tx.amount);
      const valueClass = isIncome ? 'ledger-item-value text-success' : 'ledger-item-value text-danger';
      // HTML template
      li.innerHTML = `
        <div class="ledger-item-left">
          <div class="category-badge ${catInfo.class}" title="${catInfo.label}">
            ${getCategoryIconSVG(tx.category, tx.type)}
          </div>
          <div class="ledger-item-info">
            <h4 class="ledger-item-title">${escapeHTML(tx.description)}</h4>
            <div class="ledger-item-meta">
              <span>${catInfo.label}</span>
              <div class="meta-dot"></div>
              <span>${formatDateString(tx.date)}</span>
            </div>
          </div>
        </div>
        <div class="ledger-item-right">
          <span class="${valueClass}">${displayAmount}</span>
          <button class="btn-delete" title="Delete record">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      `;
      // Set delete event listener
      li.querySelector('.btn-delete').addEventListener('click', () => {
        deleteTransaction(tx.id);
      });
      DOM.transactionList.appendChild(li);
    });
  }
}
// Secure HTML Escaper
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
// Convert date string into friendly readable string
function formatDateString(dateStr) {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return dateStr;
}
// Fetch suitable SVG icons inline based on categories
function getCategoryIconSVG(cat, type) {
  const svgOpen = `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">`;
  
  if (type === 'income') {
    return svgOpen + `<line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
  }
  switch(cat) {
    case 'food':
      return svgOpen + `<path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>`;
    case 'rent':
      return svgOpen + `<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    case 'utilities':
      return svgOpen + `<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
    case 'entertainment':
      return svgOpen + `<rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`;
    case 'transport':
      return svgOpen + `<rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`;
    case 'shopping':
      return svgOpen + `<circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>`;
    default:
      return svgOpen + `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }
}
// ==========================================================================
// Operations & Mutations
// ==========================================================================
// Add a transaction
function addTransaction(tx) {
  state.transactions.push(tx);
  saveToLocalStorage();
  updateDashboard();
}
// Delete a transaction
function deleteTransaction(id) {
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveToLocalStorage();
  updateDashboard();
}
// Reset entire state
function clearHubData() {
  if (confirm('Are you sure you want to securely clear all financial records in this hub? This cannot be undone.')) {
    localStorage.removeItem('kols_budget_state');
    state = {
      budget: 2000,
      transactions: []
    };
    DOM.baseBudgetInput.value = 2000;
    saveToLocalStorage();
    updateDashboard();
  }
}
// ==========================================================================
// Validation Helpers
// ==========================================================================
function validateField(inputElement, wrapper, errorMsgElement, validationFn) {
  const value = inputElement.value.trim();
  const isValid = validationFn(value);
  
  if (isValid) {
    wrapper.classList.remove('is-invalid');
  } else {
    wrapper.classList.add('is-invalid');
  }
  return isValid;
}
// ==========================================================================
// Initializations & Event Listeners
// ==========================================================================
function init() {
  // Load local memory
  loadFromLocalStorage();
  
  // Default values to UI
  DOM.baseBudgetInput.value = state.budget;
  DOM.txDate.value = getFormattedDate(new Date());
  // Determine current active transaction type to load categories
  const selectedType = document.querySelector('input[name="txType"]:checked').value;
  populateCategoryDropdown(selectedType);
  // Set Submit Button Text base
  updateSubmitButtonLabel(selectedType);
  // Update whole visual grid
  updateDashboard();
  
  setupListeners();
}
function updateSubmitButtonLabel(type) {
  if (type === 'income') {
    DOM.btnSubmitText.textContent = 'Log Income';
  } else {
    DOM.btnSubmitText.textContent = 'Log Expense';
  }
}
function setupListeners() {
  
  // 1. Budget input adjust
  DOM.baseBudgetInput.addEventListener('input', (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val) || val < 0) {
      val = 0;
    }
    state.budget = val;
    saveToLocalStorage();
    updateDashboard();
  });
  // 2. Type selectors (Income vs Expense)
  DOM.typeExpense.addEventListener('change', (e) => {
    if (e.target.checked) {
      populateCategoryDropdown('expense');
      updateSubmitButtonLabel('expense');
      // Update validation UI if present
      DOM.txAmount.parentElement.classList.remove('is-invalid');
      DOM.txDescription.classList.remove('is-invalid');
    }
  });
  DOM.typeIncome.addEventListener('change', (e) => {
    if (e.target.checked) {
      populateCategoryDropdown('income');
      updateSubmitButtonLabel('income');
      // Update validation UI if present
      DOM.txAmount.parentElement.classList.remove('is-invalid');
      DOM.txDescription.classList.remove('is-invalid');
    }
  });
  // 3. Quick Amount Presets
  DOM.quickPresets.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-btn');
    if (!btn) return;
    
    const increment = parseFloat(btn.dataset.val);
    let currentVal = parseFloat(DOM.txAmount.value) || 0;
    
    DOM.txAmount.value = (currentVal + increment).toFixed(2);
    DOM.txAmount.parentElement.classList.remove('is-invalid');
  });
  // 4. Form Submission
  DOM.transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Validations check
    const isAmountValid = validateField(
      DOM.txAmount,
      DOM.txAmount.parentElement,
      DOM.amountError,
      val => val !== '' && !isNaN(val) && parseFloat(val) > 0
    );
    const isDescValid = validateField(
      DOM.txDescription,
      DOM.txDescription,
      DOM.descError,
      val => val.trim().length > 0
    );
    const isDateValid = DOM.txDate.value !== '';
    if (!isDateValid) {
      DOM.txDate.style.borderColor = 'var(--color-danger)';
    } else {
      DOM.txDate.style.borderColor = '';
    }
    if (!isAmountValid || !isDescValid || !isDateValid) {
      return; // Stop submission
    }
    // Capture entry
    const type = document.querySelector('input[name="txType"]:checked').value;
    const newTx = {
      id: 'tx-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      type: type,
      amount: parseFloat(DOM.txAmount.value),
      category: DOM.txCategory.value,
      date: DOM.txDate.value,
      description: DOM.txDescription.value.trim()
    };
    // Add & Recalculate
    addTransaction(newTx);
    // Form resets with graceful preservation of Date
    DOM.txAmount.value = '';
    DOM.txDescription.value = '';
    // Restore today's date placeholder
    DOM.txDate.value = getFormattedDate(new Date());
    
    // Clear validation borders
    DOM.txAmount.parentElement.classList.remove('is-invalid');
    DOM.txDescription.classList.remove('is-invalid');
  });
  // Real-time error removal on typing
  DOM.txAmount.addEventListener('input', () => {
    const val = parseFloat(DOM.txAmount.value);
    if (!isNaN(val) && val > 0) {
      DOM.txAmount.parentElement.classList.remove('is-invalid');
    }
  });
  DOM.txDescription.addEventListener('input', () => {
    if (DOM.txDescription.value.trim().length > 0) {
      DOM.txDescription.classList.remove('is-invalid');
    }
  });
  // 5. Reset Data
  DOM.clearDataBtn.addEventListener('click', clearHubData);
  // 6. Ledger Search
  DOM.ledgerSearch.addEventListener('input', (e) => {
    activeFilters.searchQuery = e.target.value.trim();
    renderLedgerList();
  });
  // 7. Ledger Category select filter
  DOM.ledgerCategoryFilter.addEventListener('change', (e) => {
    activeFilters.category = e.target.value;
    renderLedgerList();
  });
  // 8. Ledger tab filters (All/Income/Expenses)
  DOM.filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      DOM.filterButtons.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      
      activeFilters.type = e.target.dataset.filter;
      renderLedgerList();
    });
  });
}
// Start processing
window.addEventListener('DOMContentLoaded', init);