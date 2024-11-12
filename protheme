// Sabit değerler ve konfigürasyon
const ON_CHANGE_DEBOUNCE_TIMER = 300; // Değişiklik gecikmesi ms cinsinden
const currentDate = new Date();

// Pub/Sub olayları için sabitler 
const PUB_SUB_EVENTS = {
    cartUpdate: 'cart-update',
    quantityUpdate: 'quantity-update', 
    variantChange: 'variant-change'
};

const POST_LINK_INT = 'xml_eval';

// Event subscriber yönetimi
let subscribers = {};

/**
 * Belirli bir olaya abone olur
 * @param {string} eventName - Olay adı
 * @param {Function} callback - Çağırılacak fonksiyon
 * @returns {Function} Aboneliği kaldırmak için fonksiyon
 */
function subscribe(eventName, callback) {
    if (subscribers[eventName] === undefined) {
        subscribers[eventName] = [];
    }
    
    subscribers[eventName] = [...subscribers[eventName], callback];
    
    return function unsubscribe() {
        subscribers[eventName] = subscribers[eventName].filter(cb => cb !== callback);
    };
}

/**
 * Olayı tetikler ve abonelere bildirir
 * @param {string} eventName - Olay adı 
 * @param {*} data - Olay verisi
 */
function publish(eventName, data) {
    if (subscribers[eventName]) {
        subscribers[eventName].forEach(callback => {
            callback(data);
        });
    }
}

// Sepet ürün kaldırma butonu bileşeni
class CartRemoveButton extends HTMLElement {
    constructor() {
        super();
        this.addEventListener('click', event => {
            event.preventDefault();
            
            const cartItems = this.closest('cart-items') || 
                            this.closest('cart-drawer-items');
                            
            if (this.clearCart) {
                cartItems.clearCart();
            } else {
                cartItems.updateQuantity(this.dataset.index, 0);
            }
        });
    }
}

customElements.define('cart-remove-button', CartRemoveButton);

// Sepet ürünleri bileşeni  
class CartItems extends HTMLElement {
    constructor() {
        super();
        
        this.currentDate = formatDates(currentDate, date);
        this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status') || 
                                   document.getElementById('CartDrawer-LineItemStatus');
                                   
        this.secondCartItems = document.querySelector('cart-drawer-items');

        const onDebounce = debounce(event => {
            this.onChange(event);
        }, ON_CHANGE_DEBOUNCE_TIMER);

        if (!this.currentDate) {
            window.Shopify.cart_add_url = '/cart/add';
        }

        this.addEventListener('change', onDebounce.bind(this));
    }

    cartUpdateUnsubscriber = undefined;

    connectedCallback() {
        this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, event => {
            if (event.source === 'cart-items') return;
            this.onCartUpdate();
        });
    }

    disconnectedCallback() {
        if (this.cartUpdateUnsubscriber) {
            this.cartUpdateUnsubscriber();
        }
    }

    // Sepet değişikliklerini işler
    onChange(event) {
        this.updateQuantity(
            event.target.dataset.index,
            event.target.value,
            document.activeElement.getAttribute('name')
        );
    }

    // Sepeti günceller
    onCartUpdate() {
        fetch('/cart?section_id=main-cart-items')
            .then(response => response.text())
            .then(responseText => {
                const html = new DOMParser().parseFromString(responseText, 'text/html');
                const sourceQty = html.querySelector('cart-items');
                this.innerHTML = sourceQty.innerHTML;
            })
            .catch(e => {
                console.error(e);
            });
    }

    // Sepeti sunucuyla senkronize eder 
    getSectionsToRender() {
        return [
            {
                id: 'main-cart-items',
                section: this.dataset.id,
                selector: '.js-contents'
            },
            {
                id: 'cart-icon-bubble',
                section: 'cart-icon-bubble',
                selector: '.shopify-section'
            },
            {
                id: 'cart-live-region-text',
                section: 'cart-live-region-text',
                selector: '.shopify-section'
            },
            {
                id: 'main-cart-footer',
                section: document.getElementById('main-cart-footer').dataset.id,
                selector: '.js-contents'
            }
        ];
    }

    // Ürün miktarını günceller
    updateQuantity(line, quantity, name) {
        this.enableLoading(line);

        const body = JSON.stringify({
            line,
            quantity,
            sections: this.getSectionsToRender().map((section) => section.section),
            sections_url: window.location.pathname
        });

        fetch('' + routes.cart_change_url, {
            ...fetchConfig(), 
            ...{ body }
        })
        .then((response) => {
            return response.text();
        })
        .then((state) => {
            const parsedState = JSON.parse(state);
            const quantityElement = document.getElementById('Quantity-' + line) || 
                                  document.getElementById('Drawer-quantity-' + line);
                                  
            const items = document.querySelectorAll('.cart-item');

            if (parsedState.errors) {
                quantityElement.value = quantityElement.getAttribute('value');
                this.updateLiveRegions(line, parsedState.errors);
                return;
            }

            this.classList.toggle('is-empty', parsedState.item_count === 0);
            const cartFooter = document.getElementById('main-cart-footer');

            if (cartFooter) {
                cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
            }

            this.getSectionsToRender().forEach((section => {
                const elementToReplace = document.getElementById(section.id).querySelector(section.selector) || 
                                      document.getElementById(section.id);
                                      
                elementToReplace.innerHTML = this.getSectionInnerHTML(
                    parsedState.sections[section.section],
                    section.selector
                );
            }));

            const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
            let message = '';
            
            if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
                if (typeof updatedValue === 'undefined') {
                    message = window.cartStrings.error;
                } else {
                    message = window.cartStrings.quantityError.replace(
                        '[quantity]',
                        updatedValue
                    );
                }
            }

            this.updateLiveRegions(line, message);

            const lineItem = document.getElementById('CartItem-' + line) || 
                           document.getElementById('CartDrawer-Item-' + line);
                           
            if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
                cartDrawer 
                    ? trapFocus(cartDrawer, lineItem.querySelector(`[name="${name}"]`))
                    : lineItem.querySelector(`[name="${name}"]`).focus();
            } else if (parsedState.item_count === 0 && cartDrawer) {
                trapFocus(
                    cartDrawer.querySelector('.drawer__inner-empty'),
                    cartDrawer.querySelector('a')
                );
            } else if (document.querySelector('.cart-item') && cartDrawer) {
                trapFocus(cartDrawer, document.querySelector('.cart-item__name'));
            }
            
            publish(PUB_SUB_EVENTS.cartUpdate, {source: 'cart-items'});

        }).catch(() => {
            this.querySelectorAll('.loading-overlay').forEach((overlay) => 
                overlay.classList.add('hidden')
            );
            const errors = document.getElementById('cart-errors') || 
                          document.getElementById('CartDrawer-CartErrors');
            errors.textContent = window.cartStrings.error;
        })
        .finally(() => {
            this.disableLoading(line);
            
            if (this.secondCartItems && this.secondCartItems.updateCart) {
                this.secondCartItems.updateCart();
            }
        });
    }

    // Hata mesajlarını günceller
    updateLiveRegions(line, message) {
        const lineItemError = document.getElementById('Line-item-error-' + line) || 
                            document.getElementById('CartDrawer-LineItemError-' + line);
                            
        if (lineItemError) {
            lineItemError.querySelector('.cart-item__error-text').innerHTML = message;
        }

        this.lineItemStatusElement.setAttribute('aria-hidden', true);

        const cartStatus = document.getElementById('cart-live-region-text') || 
                          document.getElementById('CartDrawer-LiveRegionText');
                          
        cartStatus.setAttribute('aria-hidden', false);

        setTimeout(() => {
            cartStatus.setAttribute('aria-hidden', true);
        }, 1000);
    }

    // HTML içeriğini döndürür
    getSectionInnerHTML(html, selector) {
        return new DOMParser()
            .parseFromString(html, 'text/html')
            .querySelector(selector)
            .innerHTML;
    }

    // Yükleme durumunu aktifleştirir
    enableLoading(line) {
        const mainCartItems = document.getElementById('main-cart-items') || 
                            document.getElementById('CartDrawer-CartItems');
                            
        mainCartItems.classList.add('cart__items--disabled');

        const cartItemElements = this.querySelectorAll(
            `#CartItem-${line} .loading-overlay`
        );
        const cartDrawerItemElements = this.querySelectorAll(
            `#CartDrawer-Item-${line} .loading-overlay`
        );

        [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => 
            overlay.classList.remove('hidden')
        );

        document.activeElement.blur();
        this.lineItemStatusElement.setAttribute('aria-hidden', false);
    }

    // Yükleme durumunu devre dışı bırakır
    disableLoading(line) {
        const mainCartItems = document.getElementById('main-cart-items') || 
                            document.getElementById('CartDrawer-CartItems');
                            
        mainCartItems.classList.remove('cart__items--disabled');

        const cartItemElements = this.querySelectorAll(
            `#CartItem-${line} .loading-overlay`
        );
        
        const cartDrawerItemElements = this.querySelectorAll(
            `#CartDrawer-Item-${line} .loading-overlay`
        );
        
        cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
        cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    }

    // Sepeti temizler
    clearCart() {
        const body = JSON.stringify({
            sections: this.getSectionsToRender().map((section) => section.section),
            sections_url: window.location.pathname,
        });

        fetch(`${routes.cart_clear_url}`, {
            ...fetchConfig(),
            ...{ body },
        })
            .then((response) => {
                return response.text();
            })
            .then((state) => {
                const parsedState = JSON.parse(state);
                this.classList.add('is-empty');
                const cartDrawer = document.querySelector('cart-drawer');
                const cartFooter = document.getElementById('main-cart-footer'); 

                if (cartFooter) {
                    cartFooter.classList.add('is-empty');
                }
                
                if (cartDrawer) {
                    cartDrawer.classList.remove('is-empty');
                }

                this.getSectionsToRender().forEach((section) => {
                    const elementToReplace =
                        document.getElementById(section.id).querySelector(section.selector) ||
                        document.getElementById(section.id);

                    elementToReplace.innerHTML = this.getSectionInnerHTML(
                        parsedState.sections[section.section],
                        section.selector
                    );
                });

                if (cartDrawer) {
                    trapFocus(
                        cartDrawer.querySelector('.drawer__inner-empty'),
                        cartDrawer.querySelector('a')
                    );
                }

                publish(PUB_SUB_EVENTS.cartUpdate, {source: 'cart-items'});
            })
            .catch(() => {
                this.querySelectorAll('.loading-overlay').forEach((overlay) =>
                    overlay.classList.add('hidden')
                );

                const errors = document.getElementById('cart-errors') ||
                    document.getElementById('CartDrawer-CartErrors');
                errors.textContent = window.cartStrings.error;
            });
    }
}

customElements.define('cart-items', CartItems);

// Diğer yardımcı fonksiyonlar
function debounce(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

function fetchConfig(type = 'json') {
    return {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': `application/${type}`
        }
    };
}

function addDays(date, days) {
    var result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDates(currentDate, targetDate, maxDays = 27) {
    if (!currentDate || !targetDate) return;

    const target = new Date(targetDate + "T00:00:00Z");
    const targetYear = target.getFullYear();
    const targetMonth = target.getMonth(); 
    const targetDay = target.getDate();
    const targetDateObj = new Date(targetYear, targetMonth, targetDay);

    const timeDiff = currentDate - targetDateObj;
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    return daysDiff <= maxDays;
}
// Sepet çekmecesi bileşeni
class CartDrawer extends HTMLElement {
    constructor() {
        super();
        this.upsellHandles = this.getUpsellHandles();
        this.bindEvents();
        
        this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
        
        this.querySelector('#CartDrawer-Overlay')
            .addEventListener('click', this.close.bind(this));
            
        this.setHeaderIconAccessibility();
    }

    // Upsell ürünlerinin tanıtıcılarını alır
    getUpsellHandles() {
        const upsellElements = this.querySelectorAll('cart-drawer-upsell[data-toggle="true"], cart-drawer-gift');
        const handles = [];
        
        upsellElements.forEach(element => {
            if (element.dataset.handle) {
                handles.push(element.dataset.handle);
            }
        });
        
        return handles;
    }

    // Header sepet ikonunu ayarlar 
    setHeaderIconAccessibility() {
        const cartLink = document.querySelector('.header__icon--cart');
        const cartBubble = cartLink.getAttribute('data-cart-count');
        
        cartLink.setAttribute('role', 'button');
        cartLink.setAttribute('aria-haspopup', 'dialog');
        
        cartLink.addEventListener('click', event => {
            event.preventDefault();
            this.open(cartLink);
        });

        this.cartBubbleId = cartBubble.querySelector('span').dataset[this.dataset.type];
        
        cartLink.addEventListener('keydown', evt => {
            if (evt.code.toUpperCase() === 'SPACE') {
                event.preventDefault();
                this.open(cartLink);
            }
        });
    }

    // Çekmeceyi açar
    open(opener) {
        if (opener) this.setActiveElement(opener);
        
        const summaryElement = this.querySelector('summary');
        
        if (summaryElement && !summaryElement.hasAttribute('role')) {
            this.setSummaryAccessibility(summaryElement);
        }

        // Animasyon için zamanlama
        setTimeout(() => {
            this.classList.add('animate', 'active');
        });

        this.addEventListener('transitionend', () => {
            const containerToTrapFocusOn = this.classList.contains('is-empty') 
                ? this.querySelector('.drawer__inner-empty')
                : document.getElementById('CartDrawer-CartItems');
                
            const focusElement = this.querySelector('.drawer__inner') || 
                               this.querySelector('.drawer__close');
                               
            trapFocus(containerToTrapFocusOn, focusElement);
        }, { once: true });

        document.body.classList.add('overflow-hidden');

        const countdownTimer = this.querySelector('countdown-timer');
        if (countdownTimer) countdownTimer.playTimer();
    }

    // Çekmeceyi kapatır  
    close() {
        this.classList.remove('active');
        removeTrapFocus(this.activeElement);
        document.body.classList.remove('overflow-hidden');
    }

    // Summary elementini erişilebilir hale getirir
    setSummaryAccessibility(element) {
        element.setAttribute('role', 'button');
        element.setAttribute('aria-expanded', 'false');
        
        if (element.nextElementSibling.hasAttribute('id')) {
            element.setAttribute('aria-controls', element.nextElementSibling.id);
        }

        element.addEventListener('click', (event) => {
            event.currentTarget.setAttribute(
                'aria-expanded',
                !event.currentTarget.closest('details').hasAttribute('open')
            );
        });

        element.parentElement.addEventListener('keyup', onKeyUpEscape);
    }

    // Sepet içeriğini render eder
    renderContents(parsedState, skipRerender = false) {
        this.querySelector('.drawer__inner').classList.contains('is-empty') && 
            this.querySelector('.drawer__inner').classList.remove('is-empty');
            
        this.productId = parsedState.id;

        this.getSectionsToRender().forEach((section => {
            const elementToReplace = section.selector
                ? document.querySelector(section.selector) 
                : document.getElementById(section.id);
                
            if (elementToReplace) {
                elementToReplace.innerHTML = this.getSectionInnerHTML(
                    parsedState.sections[section.id],
                    section.selector
                );
            }
        }));

        // Countdown timer'ı başlatır
        const countdownTimer = this.querySelector('countdown-timer');
        if (countdownTimer && countdownTimer.playTimer) countdownTimer.playTimer();

        // Gift ürünlerini kontrol eder
        let toRemove = [], 
            toAdd = [];
            
        this.querySelectorAll('cart-drawer-gift').forEach(giftProduct => {
            if (giftProduct.getUpdateRequired()) {
                if (this.querySelector('.cart-item--product-' + giftProduct.dataset.handle)) {
                    if (giftProduct.dataset.selected === 'false') {
                        toRemove.push(giftProduct);
                    }
                } else {
                    if (giftProduct.dataset.selected === 'true') {
                        toAdd.push(giftProduct); 
                    }
                }
            }
        });

        if (toRemove.length > 0) {
            toRemove[0].removeFromCart();
        } else if (toAdd.length > 0) {
            toAdd[0].addToCart();
        }

        setTimeout(() => {
            this.querySelector('#CartDrawer-Overlay')
                .addEventListener('click', this.close.bind(this));

            if (skipRerender) return;
            
            this.open();
        });
    }

    // HTML içeriğini parse eder
    getSectionInnerHTML(html, selector = '.shopify-section') {
        let container = new DOMParser()
            .parseFromString(html, 'text/html')
            .querySelector(selector);
            
        if (selector === '.shopify-section') {
            fixParsedHtml(this, container);
        }

        let content = container.innerHTML;
        return content;
    }

    // Render edilecek bölümleri döndürür
    getSectionsToRender() {
        return [
            {
                id: 'cart-drawer',
                selector: '.shopify-section'
            },
            {
                id: 'cart-icon-bubble'
            }
        ];
    }

    // DOM elementini parse eder
    getSectionDOM(html, selector = '.shopify-section') {
        return new DOMParser()
            .parseFromString(html, 'text/html')
            .querySelector(selector);
    }

    // Aktif elementi ayarlar
    setActiveElement(element) {
        this.activeElement = element;
    }
}

customElements.define('cart-drawer', CartDrawer);

// Çekmece içindeki sepet öğeleri
class CartDrawerItems extends CartItems {
    constructor() {
        super();
        this.cartDrawer = document.querySelector('cart-drawer');
        this.mainCartItems = document.querySelector('cart-items');
    }

    // Sepeti günceller
    updateCart() {
        fetch('/cart/update.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                updates: {},
                sections: [
                    'cart-drawer',
                    'cart-icon-bubble'
                ],
                sections_url: window.location.pathname
            })
        })
        .then(response => response.json())
        .then(parsedState => {
            document.querySelector('cart-drawer')
                .renderContents(parsedState, true);
        })
        .catch(error => {
            console.error(error);
        });
    }

    // HTML içeriğini parse eder
    getSectionInnerHTML(html, selector) {
        let container = new DOMParser()
            .parseFromString(html, 'text/html')
            .querySelector(selector);
            
        if (selector === '.drawer__inner') {
            fixParsedHtml(this.cartDrawer, container);
        }

        let content = container.innerHTML;
        return content;
    }

    // Render edilecek bölümleri döndürür
    getSectionsToRender() {
        return [
            {
                id: 'CartDrawer-CartItems',
                section: 'cart-drawer',
                selector: '.drawer__inner'
            },
            {
                id: 'cart-icon-bubble', 
                section: 'cart-icon-bubble',
                selector: '.shopify-section'
            }
        ];
    }
}

customElements.define('cart-drawer-items', CartDrawerItems);

// Parse edilen HTML'i düzeltir
function fixParsedHtml(container, parsedContainer) {
    const timer = parsedContainer.querySelector('.cart-timer');
    
    if (timer) {
        const oldTimer = container.querySelector('.cart-timer');
        if (oldTimer) timer.innerHTML = oldTimer.innerHTML;
    }

    const upsellProducts = container.querySelectorAll('cart-drawer-upsell');
    let parsedUpsellProducts = parsedContainer.querySelectorAll('cart-drawer-upsell');

    upsellProducts.forEach((product, index) => {
        if (product.nodeName.toLowerCase() === 'cart-drawer-upsell') {
            parsedUpsellProducts[index].dataset.selected = product.dataset.selected;
        }

        parsedUpsellProducts[index].dataset.id = product.dataset.id;
        parsedUpsellProducts[index].querySelector('input[name="id"]').value = 
            product.querySelector('input[name="id"]').value;

        if (parsedUpsellProducts[index].querySelector('.upsell__image__img')) {
            parsedUpsellProducts[index].querySelector('.upsell__image__img').src = 
                product.querySelector('.upsell__image__img').src;
        }

        if (parsedUpsellProducts[index].querySelector('.select__select')) {
            const productSelects = product.querySelectorAll('select');
            parsedUpsellProducts[index].querySelectorAll('select').forEach((select, selectIndex) => {
                select.value = productSelects[selectIndex].value;
                
                select.querySelectorAll('option').forEach(option => {
                    option.removeAttribute('selected');
                    if (option.value === productSelects[selectIndex].value.toLowerCase()) {
                        option.setAttribute('selected', '');
                    }
                });
            });
        }

        if (product.dataset.updatePrices === 'true') {
            const priceContainer = parsedUpsellProducts[index].querySelector('.upsell__price');
            const originalPriceContainer = product.querySelector('.upsell__price');
            
            if (priceContainer && originalPriceContainer) {
                priceContainer.innerHTML = originalPriceContainer.innerHTML;
            }
        }
    });
}
// Ürün formu bileşeni
class ProductForm extends HTMLElement {
    constructor() {
        super();
        
        this.form = this.querySelector('form');
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        
        this.formIdInput = this.form.querySelector('[name="id"]');
        this.formIdInput.disabled = false;
        
        this.hasCustomFields = this.classList.contains('product-form');
        this.additionalAtcButtons = this.hasCustomFields 
            ? document.querySelectorAll('.main-product-atc') 
            : [];
            
        this.skipCart = this.formIdInput.dataset.skipCart === 'true';
        
        this.cart = document.querySelector('cart-drawer') || 
                   document.querySelector('cart-notification');
                   
        this.skipPrepend = this.dataset.skipPrepend === 'true';
        
        this.submitButton = this.querySelector('[type="submit"]');

        if (document.querySelector('cart-drawer')) {
            this.submitButton.setAttribute('aria-haspopup', 'dialog');
            this.hasDrawer = true;
        }

        this.loadingSpinner = this.submitButton.querySelector('.loading-overlay__spinner');
        
        this.displayedSubmitButton = document.getElementById('DisplayedSubmitBtn-' + this.dataset.section);
        this.variantSelects = document.getElementById('variant-selects-' + this.dataset.section);
        this.productInfo = document.getElementById('ProductInfo-' + this.dataset.section);
        
        this.quantityBreaks = document.getElementById('quantity-breaks-' + this.dataset.section);
        this.quantityGifts = document.getElementById('quantity-gifts-' + this.dataset.section);
        this.mainBundleItems = document.querySelectorAll('[id^="MainBundleOffer-' + this.dataset.section + '"]');
        
        this.customFields = document.querySelectorAll('[id^="CustomField-' + this.dataset.section + '"]');
        this.appPropertyInputs = this.form.querySelector('.app-property-inputs');
    }

    // Form gönderildiğinde
    onSubmitHandler(evt) {
        let submitTarget = null;
        let skipRerender = false;

        if (evt) {
            evt.preventDefault();
            if (evt.target.classList.contains('btn--has-spinner')) {
                submitTarget = evt.target;
                submitTarget.classList.remove('loading');
            }
            
            if (evt.target.dataset.skipRerender === 'true') {
                skipRerender = true;
            }
        }

        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();
        this.submitButton.setAttribute('aria-disabled', true);

        if (!submitTarget) {
            this.submitButton.classList.add('loading');
            if (this.loadingSpinner) {
                this.loadingSpinner.classList.remove('hidden');
            }
        }

        // App property inputları devre dışı bırak
        this.inputs.forEach(input => {
            input.setAttribute('disabled', '');
        });

        if (this.additionalAtcButtons) {
            this.additionalAtcButtons.forEach(button => {
                button.setAttribute('disabled', '');
            });
        }

        // Form verilerini hazırla
        const body = this.getFormData();

        // Sunucuya gönder
        fetch('/cart/add', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
        .then(response => response.json())
        .then(response => {
            // Hata kontrolü
            if (response.status) {
                this.handleError(response.errors);
                return;
            }

            // Direkt checkout'a git
            if (this.skipCart || skipRerender) {
                window.location = '/checkout';
                return;
            } else if (!this.cart) {
                window.location = window.Shopify.cart_url;
                return;
            }

            // Sepeti güncelle
            if (!this.error) {
                publish(PUB_SUB_EVENTS.cartUpdate, {source: 'product-form'});
            }

            this.error = false;

            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
                document.body.addEventListener('modalClosed', () => {
                    setTimeout(() => {
                        this.cart.renderContents(response, this.skipPrepend);
                    });
                }, { once: true });
                quickAddModal.hide(true);
            } else {
                this.cart.renderContents(response, this.skipPrepend);
            }
        })
        .catch(e => {
            console.error(e);
        })
        .finally(() => {
            // Loading state'i kaldır
            if (submitTarget) {
                submitTarget.classList.remove('loading');
            } else {
                this.submitButton.classList.remove('loading');
                if (this.loadingSpinner) {
                    this.loadingSpinner.classList.add('hidden');
                }
            }

            // Butonları aktifleştir
            this.additionalAtcButtons.forEach(button => {
                button.removeAttribute('disabled');
            });

            if (this.displayedSubmitButton) {
                this.displayedSubmitButton.removeAttribute('disabled');
                this.displayedSubmitButton.classList.remove('loading');
            }

            // Sepetin boş olup olmadığını kontrol et
            if (this.cart && this.cart.classList.contains('is-empty')) {
                this.cart.classList.remove('is-empty');
            }

            if (!this.error) {
                this.submitButton.removeAttribute('aria-disabled');
            }
        });
    }

    // Form verilerini hazırlar
    getFormData() {
        const formData = new FormData(this.form);
        const body = {};

        // Input değerlerini ekle
        for (let [key, value] of formData) {
            body[key] = value;
        }

        // Sections ekle
        if (this.cart) {
            body.sections = this.cart.getSectionsToRender()
                .map(section => section.id);
            body.sections_url = window.location.pathname;
        }

        return body;
    }

    // Hata mesajlarını yönetir
    handleErrorMessage(errorMessage = false) {
        this.errorMessageWrapper = this.errorMessageWrapper || 
            this.querySelector('.product-form__error-message-wrapper');
            
        if (!this.errorMessageWrapper) return;

        this.errorMessage = this.errorMessage || 
            this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);
        if (errorMessage) {
            this.errorMessage.textContent = errorMessage;
        }
    }
}

customElements.define('product-form', ProductForm);

// Ürün bilgisi bileşeni
class ProductInfo extends HTMLElement {
    constructor() {
        super();
        
        this.input = this.querySelector('.quantity__input');
        this.currentVariant = this.querySelector('[name="id"]');
        this.variantSelects = this.querySelector('variant-radios');
        this.submitButton = this.querySelector('[type="submit"]');
        
        this.productForm = this.querySelector('product-form-' + this.dataset.section);
        this.hideOnNoStock = this.dataset.hideOnNoStock !== null;
    }

    cartUpdateUnsubscriber = undefined;
    variantChangeUnsubscriber = undefined;

    connectedCallback() {
        if (!this.input) return;

        this.quantityForm = this.querySelector('.quantity-input');
        if (!this.quantityForm) return;

        this.setQuantityBoundries();

        // Cart update subscription
        if (!this.dataset.originalSection) {
            this.cartUpdateUnsubscriber = subscribe(
                PUB_SUB_EVENTS.cartUpdate,
                this.updateQuantityRules.bind(this)
            );
        }

        // Variant change subscription
        this.variantChangeUnsubscriber = subscribe(
            PUB_SUB_EVENTS.variantChange,
            (event) => {
                const sectionId = this.dataset.originalSection 
                    ? this.dataset.originalSection 
                    : this.dataset.section;

                if (event.data.sectionId !== sectionId) return;

                this.updateQuantityRules(event.data.sectionId, event.data.html);
                this.setQuantityBoundries();
            }
        );

        // Form kontrol
        if (!this.productForm) return;
        if (!this.deferredMedia || !this.deferredMedia.src || 
            !this.deferredMedia.src.includes('video')) {
            this.productForm.shouldResetForm = true;
        }
    }

    disconnectedCallback() {
        if (this.cartUpdateUnsubscriber) {
            this.cartUpdateUnsubscriber();
        }
        
        if (this.variantChangeUnsubscriber) {
            this.variantChangeUnsubscriber();
        }
    }

    // Miktar sınırlarını ayarlar
    setQuantityBoundries() {
        const data = {
            cartQuantity: this.input.dataset.cartQuantity 
                ? parseInt(this.input.dataset.cartQuantity) 
                : 0,
            min: this.input.dataset.min 
                ? parseInt(this.input.dataset.min) 
                : 1,
            max: this.input.dataset.max 
                ? parseInt(this.input.dataset.max) 
                : null,
            step: this.input.step 
                ? parseInt(this.input.step) 
                : 1
        };

        let min = data.min;
        const max = data.max === null 
            ? data.max 
            : data.max - data.cartQuantity;

        if (max !== null) {
            min = Math.min(min, max);
        }

        if (data.cartQuantity >= data.min) {
            min = Math.min(min, data.step);
        }

        this.input.min = min;
        this.input.max = max;
        this.input.value = min;
        
        publish(PUB_SUB_EVENTS.quantityUpdate, undefined);
    }

    // Miktar kurallarını günceller 
    updateQuantityRules(sectionId, html) {
        if (!this.currentVariant || !this.currentVariant.value) return;

        // Loading state aktifleştir
        this.querySelector('.quantity__rules-cart .loading-overlay')
            .classList.remove('hidden');

        fetch(this.dataset.url + 
            '?variant=' + this.currentVariant.value + 
            '&section_id=' + this.dataset.section)
            .then((response) => response.text())
            .then((responseText) => {
                const responseHTML = new DOMParser()
                    .parseFromString(responseText, 'text/html');
                    
                this.updateQuantityRules(
                    this.dataset.section,
                    responseHTML
                );
                
                this.setQuantityBoundries();
            })
            .catch(e => {
                console.error(e);
            })
            .finally(() => {
                // Loading state kaldır
                this.querySelector('.quantity__rules-cart .loading-overlay')
                    .classList.add('hidden');
            });
    }
}

customElements.define('product-info', ProductInfo);
// Varyant seçicileri bileşeni
class VariantSelects extends HTMLElement {
    constructor() {
        super();
        
        this.prefixId = 'StickyAtcVariantPicker-';
        this.secondarySelect = document.getElementById(this.prefixId + this.dataset.section);
        this.hasSecondarySelect = false;
        
        this.quantityBreaks = document.getElementById('quantity-breaks-' + this.dataset.section);
        this.isQuantityBreaksPicker = this.dataset.isQuantityBreaksPicker === 'true';
        
        this.disablePrepend = this.dataset.disablePrepend != 'true';
        this.filtering = this.dataset.filtering === 'true';
        this.skipNonExistent = this.dataset.skipNonExistent === 'true';
        this.skipUnavailable = this.dataset.skipUnavailable === 'true';

        // Quantity breaks picker ayarları
        if (this.isQuantityBreaksPicker) {
            this.quantityBreaksPickerStyle = this.dataset.quantityBreaksPickerStyle;
            this.displayedImages = this.dataset.quantityBreaksPickerDisplayedImages;
        }

        this.addEventListener('change', this.onVariantChange);
    }

    // Varyant değişikliğinde
    onVariantChange() {
        this.updateOptions();
        this.updateMasterId();
        this.toggleAddButton(true, '', false);
        this.updatePickupAvailability();
        this.updateVariantStatuses();
        this.updateMedia();

        if (!this.currentVariant) {
            this.toggleAddButton(true, '', true);
            
            if (this.skipNonExistent && 
                findAvailableVariant(this, this.options, true, true, this.skipUnavailable)) {
                return;
            }
            
            this.setUnavailable();
        } else {
            if (this.skipUnavailable && !this.currentVariant.available) {
                if (findAvailableVariant(this, this.options, true, true, true)) {
                    return;
                }
            }
            
            this.updateMedia();
            this.updateURL();
            this.updateFormID();
            this.updateVariantInput();
            this.updateShareUrl();
        }
    }

    // Seçenekleri günceller
    updateOptions() {
        const fieldsets = Array.from(this.querySelectorAll('fieldset'));
        this.options = fieldsets.map(fieldset => {
            const select = fieldset.querySelector('select');
            return select ? select.value : fieldset.querySelector('input:checked').value;
        });
    }

    // Master ID'yi günceller 
    updateMasterId() {
        this.currentVariant = this.getVariantData().find((variant) => {
            return !variant.options.map((option, index) => {
                return this.options[index] === option;
            }).includes(false);
        });
    }

    // Medyayı günceller
    updateMedia() {
        if (!this.currentVariant || !this.currentVariant.featured_media) return;

        const mediaGalleries = document.querySelectorAll(
            `[id^="MediaGallery-${this.dataset.section}"]`
        );
        
        mediaGalleries.forEach(mediaGallery => 
            mediaGallery.setActiveMedia(
                `${this.dataset.section}-${this.currentVariant.featured_media.id}`,
                this.disablePrepend,
                this.displayedImages,
                this.currentVariant
            )
        );

        const modalContent = document.querySelector(
            `#ProductModal-${this.dataset.section} .product-media-modal__content`
        );
        
        if (!modalContent) return;

        const newMediaModal = modalContent.querySelector(
            `[data-media-id="${this.currentVariant.featured_media.id}"]`
        );
        
        modalContent.prepend(newMediaModal);
    }

    // URL'yi günceller
    updateURL() {
        if (!this.currentVariant || this.dataset.updateUrl === 'false') return;
        
        window.history.replaceState(
            {}, 
            '', 
            `${this.dataset.url}?variant=${this.currentVariant.id}`
        );
    }

    // Pickup durumunu günceller
    updatePickupAvailability() {
        const pickupAvailability = document.querySelector('pickup-availability');
        if (!pickupAvailability) return;

        if (this.currentVariant?.available) {
            pickupAvailability.fetchAvailability(this.currentVariant.id);
        } else {
            pickupAvailability.removeAttribute('available');
            pickupAvailability.innerHTML = '';
        }
    }

    // Form ID'yi günceller
    updateFormID() {
        const form = document.querySelector(`#product-form-${this.dataset.section}`);
        if (!form) return;

        form.id = `product-form-${this.currentVariant.id}`;
        const quantitySelectors = document.querySelectorAll(
            `#cart-quantity-${this.dataset.section}`
        );
    }

    // Varyant durumlarını günceller
    updateVariantStatuses() {
        const selectedOptionOneVariants = this.variantData.filter(
            variant => this.querySelector(':checked').value === variant.option1
        );
        
        const inputWrappers = [...this.querySelectorAll('.product-form__input')];
        
        inputWrappers.forEach((option, index) => {
            if (index === 0) return;
            
            const optionInputs = [...option.querySelectorAll('input[type="radio"], select option')];
            const previousOptionSelected = inputWrappers[index - 1].querySelector(':checked').value;
            const availableOptionInputsValue = selectedOptionOneVariants
                .filter(variant => variant.available && variant.option1 === previousOptionSelected)
                .map(variantOption => variantOption[`option${index + 1}`]);
            
            const previousOptionSelectedValue = this.options[index - 1];
            
            this.setInputAvailability(
                optionInputs, 
                availableOptionInputsValue,
                previousOptionSelectedValue
            );
        });
    }

    // Input durumlarını ayarlar
    setInputAvailability(inputs, availableOptions, selectedOption) {
        inputs.forEach(input => {
            const value = input.getAttribute('value');
            const label = input.closest('label');
            const radio = label?.querySelector('input[type="radio"]');
            
            input.classList.remove('disabled', 'unavailable');
            radio?.classList.remove('disabled', 'unavailable');

            if (!availableOptions.includes(value)) {
                input.classList.add('unavailable');
                radio?.classList.add('unavailable');
            }
        });
    }

    // Varyant verilerini alır
    getVariantData() {
        this.variantData = this.variantData || 
            JSON.parse(this.querySelector('[type="application/json"]').textContent);
        return this.variantData;
    }

    // Add to cart butonunu kontrol eder
    toggleAddButton(disable = true, text, modifyClass = true) {
        const productForm = document.getElementById(`product-form-${this.dataset.section}`);
        if (!productForm) return;

        const addButton = productForm.querySelector('[name="add"]');
        const addButtonText = addButton.querySelector('.button__text');
        
        if (disable) {
            addButton.setAttribute('disabled', 'disabled');
            addButton.setAttribute('aria-disabled', 'true');
            
            if (text) addButtonText.textContent = text;
            
            modifyClass && productForm.querySelector(
                '.sold-out-message'
            )?.classList.remove('hidden');
        } else {
            addButton.removeAttribute('aria-disabled');
            addButtonText.textContent = window.variantStrings.addToCart;
            
            modifyClass && productForm.querySelector(
                '.sold-out-message'
            )?.classList.add('hidden');
            
            if (addButton.dataset.requiredFields === addButton.dataset.validFields) {
                addButton.removeAttribute('disabled');
            }
        }
    }

    // Varyant durumunu 'unavailable' yapar
    setUnavailable() {
        const addButton = document.getElementById(`product-form-${this.dataset.section}`);
        if (!addButton) return;
        
        const addButtonText = addButton.querySelector('.button__text');
        const priceElement = document.getElementById(`price-${this.dataset.section}`);
        
        if (priceElement) {
            priceElement.classList.add('visibility-hidden');
        }
        
        addButtonText.textContent = window.variantStrings.unavailable;
    }
}

customElements.define('variant-selects', VariantSelects);

// Bundle Deals bileşeni 
class BundleDeals extends HTMLElement {
    constructor() {
        super();
        
        this.variantSelectContainers = this.querySelectorAll('.bundle-deals__variant-selects-js');
        this.mediaItemContainers = this.querySelectorAll('.bundle-deals__media-item-container-js');
        this.mediaItemImgs = this.querySelectorAll('.bundle-deals__media-item-img-js');
        
        this.checkboxes = this.querySelectorAll('.bundle-deals__checkbox-js');
        this.variantSelects = this.querySelectorAll('.bundle-deals__variant-selects-js');
        
        this.skipNonExistent = this.dataset.skipNonExistent === 'true';
        this.skipUnavailable = this.dataset.skipUnavailable === 'true';
        
        this.prices = this.querySelectorAll('.bundle-deals__price-js');
        this.comparePrices = this.querySelectorAll('.bundle-deals__compare-price-js');
        
        this.totalPrice = this.querySelector('.bundle-deals__total-price-js');
        this.totalComparePrice = this.querySelector('.bundle-deals__total-compare-price-js');
        
        this.updatePrices = this.dataset.updatePrices === 'true';
        this.percentageLeft = parseFloat(this.dataset.percentageLeft);
        this.fixedDiscount = parseFloat(this.dataset.fixedDiscount);
        this.currencySymbol = this.dataset.currencySymbol;
        
        this.selectedVariants = {
            id_1: null,
            id_2: null,
            id_3: null,
            id_4: null,
            id_5: null
        };
        
        this.formVariants = [];
        
        this.initVariants();
        
        this.checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.handleCheckboxChange.bind(this))
        });
        
        this.variantSelects.forEach(select => {
            select.addEventListener('change', this.handleSelectChange.bind(this))
        });
    }

    // Varyantları başlatır
    initVariants() {
        this.checkboxes.forEach(checkbox => {
            this.selectedVariants[checkbox.dataset.idIndex] = {
                id: checkbox.dataset.id,
                price: checkbox.dataset.price,
                comparePrice: checkbox.dataset.comparePrice,
                checked: true
            };
        });
        
        this.updateFormIds();
    }

    // Checkbox değişikliklerini yönetir
    handleCheckboxChange(event) {
        const target = event.target;
        const checked = target.checked;
        const index = parseInt(target.dataset.index);
        
        this.selectedVariants[target.dataset.idIndex].checked = checked;
        
        const productContainer = this.variantSelectContainers[index];
        const selects = productContainer.querySelectorAll('select');
        
        if (checked) {
            this.mediaItemContainers[index].classList.remove(
                'bundle-deals__media-item--disabled'
            );
            
            productContainer.classList.remove('bundle-deals__product--deselected');
            selects.forEach(select => select.removeAttribute('disabled'));
        } else {
            this.mediaItemContainers[index].classList.add(
                'bundle-deals__media-item--disabled'
            );
            
            productContainer.classList.add('bundle-deals__product--deselected');
            selects.forEach(select => select.setAttribute('disabled', ''));
        }
        
        this.updateFormIds();
        
        if (this.updatePrices) {
            this.updateTotalPrice();
        }
    }

    // Select değişikliklerini yönetir  
    handleSelectChange(event) {
        const select = event.target;
        const index = parseInt(select.dataset.index);
        
        const selectValues = Array.from(
            select.querySelectorAll('select'),
            option => option.value
        );
        
        const variant = JSON.parse(
            select.querySelector('[type="application/json"]').textContent
        ).find(variant => {
            return !variant.options.map((option, optionIndex) => {
                return selectValues[optionIndex] === option;
            }).includes(false);
        });

        // Varyant durumunu kontrol et
        if (!variant) {
            if (this.skipNonExistent) {
                findAvailableVariant(select, selectValues, false, true, this.skipUnavailable);
            }
            return;
        }

        if (this.skipUnavailable && !variant.available) {
            if (findAvailableVariant(select, selectValues, false, true, true)) {
                return;
            }
        }

        // Fiyatları güncelle
        let {price, comparePrice} = variant;
        price = parseInt(price);
        
        let comparisonPrice = comparePrice 
            ? parseInt(comparePrice) 
            : price;
            
        const percentageLeft = select.dataset.percentageLeft ?? 1;
        const fixedDiscount = select.dataset.fixedDiscount ?? 0;
        
        price = (price * percentageLeft) - fixedDiscount;

        // Resmi güncelle
        if (variant.featured_image) {
            featured_image = variant.featured_image.src;
        }

        // Variant bilgilerini güncelle
        const variantId = variant.id;
        this.selectedVariants[select.dataset.idIndex].id = variantId;
        this.selectedVariants[select.dataset.idIndex].price = price;
        this.selectedVariants[select.dataset.idIndex].comparePrice = comparisonPrice;

        this.updateFormIds();

        // Fiyatları görüntüle
        if (this.updatePrices) {
            this.prices[index].innerHTML = this.currencySymbol + 
                (price / 100).toFixed(2);
                
            if (comparisonPrice > price) {
                this.comparePrices[index].innerHTML = this.currencySymbol + 
                    (comparisonPrice / 100).toFixed(2);
            } else {
                this.comparePrices[index].innerHTML = '';
            }
            
            this.updateTotalPrice();
        }

        // Resmi güncelle
        if (featured_image && featured_image.length > 0 && this.mediaItemImgs[index]) {
            this.mediaItemImgs[index].src = featured_image;
        }
    }

    // Form ID'lerini günceller
    updateFormIds() {
        const formInputs = [];
