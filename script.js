console.log('Скрипт стартовал');
// ============================================
// 1. КОНФИГУРАЦИЯ
// ============================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxxn3-UhV-C7zrFdQ5ycyR7FsxfgYY_4hTVriWTs05kIph4MNA7i1uY17as7zx1EHoh/exec';
const VERIFICATION_TOKEN = 'Тут_токен';

// Запрещённые символы (регулярное выражение)
const FORBIDDEN_CHARS = /[<>{}[\]\\|"']/g;

// ============================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

// Очистка строки: удаляем запрещённые символы, нормализуем пробелы, обрезаем
function cleanString(str, maxLength) {
    if (typeof str !== 'string') return '';
    // Удаляем запрещённые символы
    let cleaned = str.replace(FORBIDDEN_CHARS, '');
    // Заменяем табы, множественные пробелы на один пробел
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // Обрезаем по длине
    if (maxLength) cleaned = cleaned.slice(0, maxLength);
    return cleaned;
}

// Проверка наличия запрещённых символов
function hasForbiddenChars(str) {
    return FORBIDDEN_CHARS.test(str);
}

// Показать уведомление (тост)
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
// 3. КАСТОМНОЕ МОДАЛЬНОЕ ОКНО
// ============================================
function showConfirmDialog(message, onConfirm) {
    // Создаём затемнение
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
    
    // Создаём окно
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
    
    // Крестик закрытия
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
    confirmBtn.textContent = 'Отправить';
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
    
    // Клик по оверлею закрывает окно
    overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
    };
    
    document.body.appendChild(overlay);
}

// ============================================
// 4. УПРАВЛЕНИЕ СОСТОЯНИЕМ КНОПКИ И ВАЛИДАЦИЯ
// ============================================
const nameInput = document.getElementById('guest_name');
const preferencesInput = document.getElementById('diet');
const ceremonyCheckboxes = document.querySelectorAll('input[name="ceremony"]');
const restaurantCheckboxes = document.querySelectorAll('input[name="restaurant"]');
const submitBtn = document.querySelector('.submit_btn');

// Контейнеры для сообщений об ошибках
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

// Проверка корректности имени
function isNameValid() {
    const rawValue = nameInput.value;
    const hasForbidden = hasForbiddenChars(rawValue);
    const trimmed = rawValue.trim();
    return !hasForbidden && trimmed.length > 0 && trimmed.length <= 300;
}

// Проверка корректности предпочтений (только запрещённые символы)
function arePreferencesValid() {
    const rawValue = preferencesInput.value;
    return !hasForbiddenChars(rawValue);
}

// Проверка, выбран ли хотя бы один чекбокс в группе
function isCheckboxGroupSelected(groupName) {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
    return Array.from(checkboxes).some(cb => cb.checked);
}

// Обновление состояния кнопки
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
// 5. ВАЛИДАЦИЯ ПОЛЕЙ ПРИ ПОТЕРЕ ФОКУСА
// ============================================
function validateNameOnBlur() {
    const rawValue = nameInput.value;
    const hasForbidden = hasForbiddenChars(rawValue);
    const trimmed = rawValue.trim();
    
    if (trimmed === '') {
        showError(nameInput, 'Поле ввода имени не может быть пустым. Введите имя или имена');
    } else if (hasForbidden) {
        showError(nameInput, 'В поле ввода запрещены следующие символы: < > { } [ ] \\ | " \'');
    } else if (trimmed.length > 300) {
        showError(nameInput, 'Имя не может быть длиннее 300 символов');
    } else {
        clearError(nameInput);
    }
    updateSubmitButton();
}

function validatePreferencesOnBlur() {
    const rawValue = preferencesInput.value;
    const hasForbidden = hasForbiddenChars(rawValue);
    
    if (hasForbidden) {
        showError(preferencesInput, 'В поле ввода запрещены следующие символы: < > { } [ ] \\ | " \'');
    } else {
        clearError(preferencesInput);
    }
    updateSubmitButton();
}

// Очистка ошибок при вводе
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
// 6. ЛОГИКА ЧЕКБОКСОВ (только один выбор, цвет сердечка)
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

// Добавляем CSS-переменную для сердечка
function injectHeartColorCSS() {
    const style = document.createElement('style');
    style.textContent = `
        .styled_checkbox:checked ~ .checkbox_custom::after {
            color: var(--heart-color, #CB402E);
        }
    `;
    document.head.appendChild(style);
}

// Запрещаем снятие последнего чекбокса в группе
function preventUncheck(groupName) {
    const checkboxes = document.querySelectorAll(`input[name="${groupName}"]`);
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('click', (e) => {
            // Если пытаются снять единственный выбранный
            if (!checkbox.checked && Array.from(checkboxes).filter(cb => cb.checked).length === 1) {
                e.preventDefault();
            }
        });
    });
}

// ============================================
// 7. АВТОРАСШИРЕНИЕ TEXTAREA (опционально)
// ============================================
function autoResizeTextarea() {
    if (!preferencesInput) return;
    preferencesInput.style.height = 'auto';
    preferencesInput.style.height = Math.min(preferencesInput.scrollHeight, 500) + 'px';
}
preferencesInput.addEventListener('input', autoResizeTextarea);
// Инициализация высоты
setTimeout(autoResizeTextarea, 100);

// ============================================
// 8. ОТПРАВКА ДАННЫХ
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
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        // При mode: 'no-cors' нет доступа к ответу, но если нет сетевой ошибки — считаем успехом
        return { success: true };
    } catch (error) {
        console.error('Ошибка отправки:', error);
        return { success: false, error: error.message };
    }
}

// Сбор и очистка данных перед отправкой
function collectAndCleanData() {
    let rawName = nameInput.value;
    let rawPreferences = preferencesInput.value;
    
    // Очистка
    let cleanName = cleanString(rawName, 300);
    let cleanPreferences = cleanString(rawPreferences, 3000);
    
    // Если после очистки имя пустое — используем "не указано" (но по валидации такого быть не должно)
    if (cleanName === '') cleanName = 'не указано';
    if (cleanPreferences === '') cleanPreferences = 'не указано';
    
    // Получение значений чекбоксов
    const ceremonyYes = document.querySelector('input[name="ceremony"][value="yes"]')?.checked;
    const ceremonyNo = document.querySelector('input[name="ceremony"][value="no"]')?.checked;
    const restaurantYes = document.querySelector('input[name="restaurant"][value="yes"]')?.checked;
    const restaurantNo = document.querySelector('input[name="restaurant"][value="no"]')?.checked;
    
    const ceremony = ceremonyYes ? 'Да' : (ceremonyNo ? 'Нет' : 'не указано');
    const restaurant = restaurantYes ? 'Да' : (restaurantNo ? 'Нет' : 'не указано');
    
    return {
        name: cleanName,
        ceremony: ceremony,
        restaurant: restaurant,
        preferences: cleanPreferences
    };
}

// Основная функция отправки (вызывается после подтверждения)
async function performSubmit() {
    const formData = collectAndCleanData();
    const result = await sendToGoogleSheets(formData);
    
    if (result.success) {
        showToast('Спасибо! Ваш ответ сохранён.');
        // Опционально: очистить форму
        // nameInput.value = '';
        // preferencesInput.value = '';
        // document.querySelectorAll('.styled_checkbox').forEach(cb => cb.checked = false);
        // updateSubmitButton();
    } else {
        showToast('Произошла ошибка при отправке. Пожалуйста, попробуйте ещё раз или свяжитесь с нами напрямую.', true);
    }
}

// Обработчик клика по кнопке
function onSubmitClick(event) {
    event.preventDefault();
    
    // Дополнительная проверка (на всякий случай)
    if (!isNameValid() || !isCheckboxGroupSelected('ceremony') || !isCheckboxGroupSelected('restaurant') || !arePreferencesValid()) {
        showToast('Пожалуйста, исправьте ошибки в форме', true);
        return;
    }
    
    const preferencesFilled = preferencesInput.value.trim() !== '';
    const message = preferencesFilled ? 'Отправить форму?' : 'Вы не указали предпочтения. Отправить форму?';
    
    showConfirmDialog(message, async () => {
        await performSubmit();
    });
}

// Инициализация
function init() {
    injectHeartColorCSS();
    setupCheckboxGroup('ceremony');
    setupCheckboxGroup('restaurant');
    preventUncheck('ceremony');
    preventUncheck('restaurant');
    
    // Установка начальных цветов для уже отмеченных чекбоксов
    document.querySelectorAll('.styled_checkbox:checked').forEach(cb => updateHeartColor(cb));
    
    // Первоначальная проверка кнопки
    updateSubmitButton();
    
    // Назначение обработчика кнопки
    if (submitBtn) submitBtn.addEventListener('click', onSubmitClick);
}

// Запуск после загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
