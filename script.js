// Constants
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHIFTS = ['Morning', 'Afternoon', 'Evening'];
const MAX_DAYS_PER_EMPLOYEE = 5;
const MIN_EMPLOYEES_PER_SHIFT = 2;

// DOM Elements
const employeeNameInput = document.getElementById('employee-name');
const preferenceSelects = document.querySelectorAll('.preference-select');
const addEmployeeBtn = document.getElementById('add-employee-btn');
const generateScheduleBtn = document.getElementById('generate-schedule-btn');
const employeeListDiv = document.getElementById('employee-list');
const scheduleDisplaySection = document.getElementById('schedule-display-section');
const employeeInputSection = document.getElementById('employee-input-section');
const scheduleTableDiv = document.getElementById('schedule-table');
const backToInputBtn = document.getElementById('back-to-input-btn');
const errorMessageDiv = document.getElementById('error-message');
const successMessageDiv = document.getElementById('success-message');

// Data storage
let employees = [];
let schedule = {};

// Initialize schedule structure
function initializeSchedule() {
    schedule = {};
    DAYS_OF_WEEK.forEach(day => {
        schedule[day] = {};
        SHIFTS.forEach(shift => {
            schedule[day][shift] = [];
        });
    });
}

// Update preference dropdowns to prevent duplicates
function updatePreferenceDropdowns() {
    const selectedValues = Array.from(preferenceSelects)
        .map(select => select.value)
        .filter(value => value !== "");
    
    preferenceSelects.forEach((select, index) => {
        // Enable/disable based on previous selections
        if (index > 0) {
            const prevSelect = preferenceSelects[index - 1];
            select.disabled = prevSelect.value === "";
        }
        
        // Update options
        Array.from(select.options).forEach(option => {
            if (option.value === "") return;
            option.disabled = selectedValues.includes(option.value) && option.value !== select.value;
        });
    });
}

// Add employee to the list
function addEmployee() {
    const name = employeeNameInput.value.trim();
    
    if (!name) {
        showError('Please enter an employee name');
        return;
    }
    
    // Collect preferences (ensuring no duplicates)
    const preferences = [];
    const selectedValues = new Set();
    
    preferenceSelects.forEach(select => {
        if (select.value !== "" && !selectedValues.has(select.value)) {
            preferences.push(select.value);
            selectedValues.add(select.value);
        }
    });
    
    // Add employee to list
    employees.push({
        name,
        preferences,
        assignedShifts: {},
        daysWorked: 0
    });
    
    // Update UI
    updateEmployeeList();
    employeeNameInput.value = '';
    preferenceSelects.forEach(select => {
        select.value = '';
        if (select.id !== 'first-pref') select.disabled = true;
    });
    
    // Show generate schedule button if we have at least 2 employees
    if (employees.length >= 2) {
        generateScheduleBtn.classList.remove('hidden');
        errorMessageDiv.textContent = '';
    }
}

// Update the employee list display
function updateEmployeeList() {
    employeeListDiv.innerHTML = '';
    
    if (employees.length === 0) {
        employeeListDiv.innerHTML = '<p>No employees added yet.</p>';
        return;
    }
    
    employees.forEach((employee, index) => {
        const card = document.createElement('div');
        card.className = 'employee-card';
        
        const name = document.createElement('h3');
        name.textContent = employee.name;
        
        const preferences = document.createElement('p');
        preferences.textContent = 'Preferences: ' + 
            (employee.preferences.length > 0 ? 
             employee.preferences.join(' (1st), ') + ' (last)' : 
             'No preferences');
        
        const removeBtn = document.createElement('button');
        removeBtn.textContent = 'Remove';
        removeBtn.style.marginTop = '10px';
        removeBtn.style.backgroundColor = '#e74c3c';
        removeBtn.addEventListener('click', () => removeEmployee(index));
        
        card.appendChild(name);
        card.appendChild(preferences);
        card.appendChild(removeBtn);
        employeeListDiv.appendChild(card);
    });
}

// Remove an employee
function removeEmployee(index) {
    employees.splice(index, 1);
    updateEmployeeList();
    
    if (employees.length < 2) {
        generateScheduleBtn.classList.add('hidden');
    }
}

// Generate the schedule
function generateSchedule() {
    initializeSchedule();
    
    // Reset employee assignments
    employees.forEach(employee => {
        employee.assignedShifts = {};
        employee.daysWorked = 0;
    });
    
    // Assign shifts based on preferences
    assignShiftsByPreference();
    
    // Ensure minimum employees per shift
    ensureMinimumCoverage();
    
    // Display the schedule
    displaySchedule();
    
    // Show success message
    successMessageDiv.textContent = 'Schedule generated successfully!';
}

// Assign shifts based on employee preferences
function assignShiftsByPreference() {
    // Try to assign each preference level in order
    for (let prefLevel = 0; prefLevel < 3; prefLevel++) {
        // Shuffle days to distribute assignments more evenly
        const shuffledDays = [...DAYS_OF_WEEK].sort(() => Math.random() - 0.5);
        
        shuffledDays.forEach(day => {
            SHIFTS.forEach(shift => {
                // Find employees who have this shift at current preference level
                const eligibleEmployees = employees.filter(employee => {
                    return employee.preferences[prefLevel] === shift && 
                           canAssignShift(employee, day, shift);
                });
                
                // Assign as many as we can
                eligibleEmployees.forEach(employee => {
                    if (canAssignShift(employee, day, shift)) {
                        assignShift(employee, day, shift);
                    }
                });
            });
        });
    }
}

// Ensure minimum employees per shift
function ensureMinimumCoverage() {
    DAYS_OF_WEEK.forEach(day => {
        SHIFTS.forEach(shift => {
            while (schedule[day][shift].length < MIN_EMPLOYEES_PER_SHIFT) {
                const availableEmployee = findAvailableEmployee(day);
                if (availableEmployee) {
                    assignShift(availableEmployee, day, shift);
                } else {
                    break; // No more available employees
                }
            }
        });
    });
}

// Check if an employee can be assigned to a shift
function canAssignShift(employee, day, shift) {
    return !employee.assignedShifts[day] && 
           employee.daysWorked < MAX_DAYS_PER_EMPLOYEE &&
           !schedule[day][shift].includes(employee);
}

// Assign a shift to an employee
function assignShift(employee, day, shift) {
    schedule[day][shift].push(employee);
    employee.assignedShifts[day] = shift;
    employee.daysWorked++;
}

// Find an available employee for a day
function findAvailableEmployee(day) {
    const availableEmployees = employees.filter(employee => {
        return !employee.assignedShifts[day] && employee.daysWorked < MAX_DAYS_PER_EMPLOYEE;
    });
    
    if (availableEmployees.length === 0) {
        return null;
    }
    
    // Randomly select an available employee if less than minimum required
    return availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
}

// in table format
function displaySchedule() {
    let tableHTML = '<table><thead><tr><th>Day</th>';
    
    SHIFTS.forEach(shift => {
        tableHTML += `<th>${shift}</th>`;
    });
    tableHTML += '</tr></thead><tbody>';
    
    // Add rows for each day
    DAYS_OF_WEEK.forEach(day => {
        tableHTML += `<tr><td>${day}</td>`;
        
        SHIFTS.forEach(shift => {
            const employeesOnShift = schedule[day][shift];
            tableHTML += '<td>';
            
            if (employeesOnShift.length === 0) {
                tableHTML += 'Not assigned';
            } else {
                tableHTML += employeesOnShift.map(emp => emp.name).join(', ');
            }
            
            tableHTML += '</td>';
        });
        
        tableHTML += '</tr>';
    });
    
    tableHTML += '</tbody></table>';
    scheduleTableDiv.innerHTML = tableHTML;
    
    // display the schedule section
    employeeInputSection.classList.add('hidden');
    scheduleDisplaySection.classList.remove('hidden');
}

// Show error message
function showError(message) {
    errorMessageDiv.textContent = message;
    setTimeout(() => {
        errorMessageDiv.textContent = '';
    }, 3000);
}

// Event Listeners
preferenceSelects.forEach((select, index) => {
    select.addEventListener('change', () => {
        updatePreferenceDropdowns();
    });
});

addEmployeeBtn.addEventListener('click', addEmployee);
generateScheduleBtn.addEventListener('click', generateSchedule);
backToInputBtn.addEventListener('click', () => {
    scheduleDisplaySection.classList.add('hidden');
    employeeInputSection.classList.remove('hidden');
    successMessageDiv.textContent = '';
});

// Initialize
initializeSchedule();
updateEmployeeList();
