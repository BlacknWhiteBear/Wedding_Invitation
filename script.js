console.log('Script started');
// ============================================
// 1. CONFIGURATION
// ============================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxxn3-UhV-C7zrFdQ5ycyR7FsxfgYY_4hTVriWTs05kIph4MNA7i1uY17as7zx1EHoh/exec';
const VERIFICATION_TOKEN = 'YOUR_TOKEN_HERE';

// Forbidden characters regex
const FORBIDDEN_CHARS = /[<>{}[\]\\|"']/g;

// ============================================
// 2. HELPER FUNCTIONS
// ============================================

// Clean string: remove forbidden characters, normalize spaces, trim
function cleanString(str, maxLength) {
    if (typeof str !== 'string') return '';
    // Remove forbidden characters
    let cleaned = str.replace(FORBIDDEN_CHARS, '');
    // Replace tabs, multiple spaces with a single space
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // Trim to max length
    if (maxLength) cleaned = cleaned.slice(0, maxLength);
    return cleaned;
}

// Check for forbidden characters
function hasForbiddenChars(str) {
    return FORBIDDEN_CHARS.test(str);
}

// Show toast notification
function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${isError ? '#f44336' : '#4CAF50'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-family: 'DotGothic16', monospace;
        font-size: 16px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: opacity 0.3s ease;
        opacity: 1;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// ============================================
// 3. CUSTOM MODAL DIALOG
// ============================================
function showConfirmDialog(message, onConfirm) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10001;
        font-family: 'DotGothic16', monospace;
    `;
    
    // Create dialog
    const dialog = document.createElement('div');
    dialog.style.cssText = `
        background: white;
        padding: 24px 32px;
        border-radius: 16px;
        border: 4px solid #000;
        text-align: center;
        min-width: 300px;
        max-width: 90%;
        position: relative;
    `;
    
    // Close button (X)
    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '✕';
    closeBtn.style.cssText = `
        position: absolute;
        top: 12px;
        right: 16px;
        font-size: 24px;
        cursor: pointer;
        color: #828282;
    `;
    closeBtn.onclick = () => overlay.remove();
    
    const messageElem = document.createElement('p');
    messageElem.textContent = message;
    messageElem.style.marginBottom = '24px';
    messageElem.style.fontSize = '18px';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Submit';
    confirmBtn.style.cssText = `
        background: #CB402E;
        color: white;
        border: 2px solid #000;
        border-radius: 8px;
        padding: 8px 24px;
        font-family: 'DotGothic16', monospace;
        font-size: 18px;
        cursor: pointer;
    `;
    confirmBtn.onclick = () => {
        overlay.remove();
        onConfirm();
    };
    
    dialog.appendChild(closeBtn);
    dialog.appendChild(messageElem);
    dialog.appendChild(confirmBtn);
    overlay.appendChild(dialog);
    
    // Click on overlay closes dialog
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
    
    document.body.appendChild(overlay);
}

// ============================================
// 4. BUTTON STATE AND VALIDATION
// ============================================
const nameInput = document.getElementById('guest_name');
const preferencesInput = document.getElementById('diet');
const ceremonyCheckboxes = document.querySelectorAll('input[name="ceremony"]');
const restaurantCheckboxes = document.querySelectorAll('input[name="restaurant"]');
const submitBtn = document.querySelector('.submit_btn');

// Create error message container
function createErrorContainer(inputElement) {
    let container = inputElement.parentNode.querySelector('.error-message');
    if (!container) {
        container = document.createElement('div');
        container.className = 'error-message';
        container.style.cssText = 'color: #f44336; font-size: 12px; margin-top: 4px;';
        inputElement.parentNode.appendChild(container);
    }
    return container;
}

function showError(inputElement, message) {
    const container = createErrorContainer(inputElement);
    container.textContent = message;
    inputElement.style.borderColor = '#f44336';
    inputElement.style.backgroundColor = '#ffe6e6';
}

function clearError(inputElement) {
    const container = inputElement.parentNode.querySelector('.error-message');
    if (container) container.textContent = '';
    inputElement.style.borderColor = '#000000';
    inputElement.style.backgroundColor = '#ffffff';
}

// Validate name
function isNameValid() {
    const rawValue = nameInput.value;
    const hasForbidden = hasForbiddenChars(rawValue);
    const trimmed = rawValue.trim();
    return !hasForbidden && trimmed.length > 0 && trimmed.length <= 300;
}

// Validate preferences (only forbidden characters)
function arePreferencesValid() {
    const rawValue = preferencesInput.value;
    return !hasForbiddenChars(rawValue);
}

// Check if at least one checkbox is selected in a group
function isCheckboxGroupSelected(groupName) {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
    return Array.from(checkboxes).some(cb => cb.checked);
}

// Update submit button state
function updateSubmitButton() {
    const nameOk = isNameValid();
    const ceremonyOk = isCheckboxGroupSelected('ceremony');
    const restaurantOk = isCheckboxGroupSelected('restaurant');
    const preferencesOk = arePreferencesValid();
    
    const enabled = nameOk && ceremonyOk && restaurantOk && preferencesOk;
    submitBtn.disabled = !enabled;
    if (enabled) {
        submitBtn.style.opacity = '1';
        submitBtn.style.cursor = 'pointer';
    } else {
        submitBtn.style.opacity = '0.5';
        submitBtn.style.cursor = 'not-allowed';
    }
}

// ============================================
// 5. VALIDATION ON BLUR
// ============================================
function validateNameOnBlur() {
    const rawValue = nameInput.value;
    const hasForbidden = hasForbiddenChars(rawValue);
    const trimmed = rawValue.trim();
    
    if (trimmed === '') {
        showError(nameInput, 'Name cannot be empty. Please enter your name.');
    } else if (hasForbidden) {
        showError(nameInput, 'Forbidden characters: < > { } [ ] \\ | " \'');
    } else if (trimmed.length > 300) {
        showError(nameInput, 'Name cannot be longer than 300 characters.');
    } else {
        clearError(nameInput);
    }
    updateSubmitButton();
}

function validatePreferencesOnBlur() {
    const rawValue = preferencesInput.value;
    const hasForbidden = hasForbiddenChars(rawValue);
    
    if (hasForbidden) {
        showError(preferencesInput, 'Forbidden characters: < > { } [ ] \\ | " \'');
    } else {
        clearError(preferencesInput);
    }
    updateSubmitButton();
}

// Clear errors on input
nameInput.addEventListener('input', () => {
    clearError(nameInput);
    updateSubmitButton();
});
preferencesInput.addEventListener('input', () => {
    clearError(preferencesInput);
    updateSubmitButton();
});

nameInput.addEventListener('blur', validateNameOnBlur);
preferencesInput.addEventListener('blur', validatePreferencesOnBlur);

// ============================================
// 6. CHECKBOX LOGIC (mutual exclusion, heart color)
// ============================================
function setupCheckboxGroup(groupName) {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (this.checked) {
                checkboxes.forEach(other => {
                    if (other !== this && other.checked) {
                        other.checked = false;
                        updateHeartColor(other);
                    }
                });
                updateHeartColor(this);
            }
            updateSubmitButton();
        });
    });
}

function updateHeartColor(checkbox) {
    const checkboxOption = checkbox.closest('.checkbox_option');
    if (!checkboxOption) return;
    const checkboxCustom = checkboxOption.querySelector('.checkbox_custom');
    if (!checkboxCustom) return;
    
    if (checkbox.checked) {
        const color = checkbox.value === 'yes' ? '#CB402E' : '#828282';
        checkboxCustom.style.setProperty('--heart-color', color);
    }
}

// Inject CSS variable for heart color
function injectHeartColorCSS() {
    const style = document.createElement('style');
    style.textContent = `
        .styled_checkbox:checked ~ .checkbox_custom::after {
            color: var(--heart-color, #CB402E);
        }
    `;
    document.head.appendChild(style);
}

// Prevent unchecking the last checkbox in a group
function preventUncheck(groupName) {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
            // If trying to uncheck the only checked checkbox
            if (!checkbox.checked && Array.from(checkboxes).filter(cb => cb.checked).length === 1) {
                e.preventDefault();
            }
        });
    });
}

// ============================================
// 7. TEXTAREA AUTO RESIZE (optional)
// ============================================
function autoResizeTextarea() {
    if (!preferencesInput) return;
    preferencesInput.style.height = 'auto';
    preferencesInput.style.height = Math.min(preferencesInput.scrollHeight, 500) + 'px';
}
preferencesInput.addEventListener('input', autoResizeTextarea);
// Initialize height
setTimeout(autoResizeTextarea, 100);

// ============================================
// 8. SEND DATA TO GOOGLE SHEETS
// ============================================
async function sendToGoogleSheets(formData) {
    const payload = {
        token: VERIFICATION_TOKEN,
        name: formData.name,
        ceremony: formData.ceremony,
        restaurant: formData.restaurant,
        preferences: formData.preferences
    };
    
    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return { success: true };
    } catch (error) {
        console.error('Send error:', error);
        return { success: false, error: error.message };
    }
}

// Collect and clean data before sending
function collectAndCleanData() {
    let rawName = nameInput.value;
    let rawPreferences = preferencesInput.value;
    
    // Clean
    let cleanName = cleanString(rawName, 300);
    let cleanPreferences = cleanString(rawPreferences, 3000);
    
    // If name is empty after cleaning, use "not specified" (should not happen due to validation)
    if (cleanName === '') cleanName = 'not specified';
    if (cleanPreferences === '') cleanPreferences = 'not specified';
    
    // Get checkbox values
    const ceremonyYes = document.querySelector('input[name="ceremony"][value="yes"]')?.checked;
    const ceremonyNo = document.querySelector('input[name="ceremony"][value="no"]')?.checked;
    const restaurantYes = document.querySelector('input[name="restaurant"][value="yes"]')?.checked;
    const restaurantNo = document.querySelector('input[name="restaurant"][value="no"]')?.checked;
    
    const ceremony = ceremonyYes ? 'Yes' : (ceremonyNo ? 'No' : 'not specified');
    const restaurant = restaurantYes ? 'Yes' : (restaurantNo ? 'No' : 'not specified');
    
    return {
        name: cleanName,
        ceremony: ceremony,
        restaurant: restaurant,
        preferences: cleanPreferences
    };
}

// Main submit function (called after confirmation)
async function performSubmit() {
    const formData = collectAndCleanData();
    const result = await sendToGoogleSheets(formData);
    
    if (result.success) {
        showToast('Thank you! Your response has been saved.');
        // Optional: clear form
        // nameInput.value = '';
        // preferencesInput.value = '';
        // document.querySelectorAll('.styled_checkbox').forEach(cb => cb.checked = false);
        // updateSubmitButton();
    } else {
        showToast('An error occurred. Please try again or contact us directly.', true);
    }
}

// Click handler for submit button
function onSubmitClick(event) {
    event.preventDefault();
    
    // Additional check (just in case)
    if (!isNameValid() || !isCheckboxGroupSelected('ceremony') || !isCheckboxGroupSelected('restaurant') || !arePreferencesValid()) {
        showToast('Please fix the errors in the form before submitting.', true);
        return;
    }
    
    const preferencesFilled = preferencesInput.value.trim() !== '';
    const message = preferencesFilled ? 'Submit the form?' : 'You did not specify any preferences. Submit anyway?';
    
    showConfirmDialog(message, async () => {
        await performSubmit();
    });
}

// ============================================
// 9. INITIALIZATION
// ============================================
function init() {
    injectHeartColorCSS();
    setupCheckboxGroup('ceremony');
    setupCheckboxGroup('restaurant');
    preventUncheck('ceremony');
    preventUncheck('restaurant');
    
    // Set initial colors for already checked checkboxes
    document.querySelectorAll('.styled_checkbox:checked').forEach(cb => updateHeartColor(cb));
    
    // Initial button state check
    updateSubmitButton();
    
    // Attach click handler to button
    if (submitBtn) submitBtn.addEventListener('click', onSubmitClick);
}

// Run after DOM is fully loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
