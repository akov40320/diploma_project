/*
 * This file implements the data and business logic for the bike shop demo.
 * It defines product and category data, manages the shopping cart in
 * localStorage and renders the various pages. The goal is to provide a
 * functional demonstration of the required features: catalog navigation,
 * product detail view, cart with discounts and shipping rules, and a simple
 * checkout flow. Data is stored in-memory and persisted only in the
 * browser's localStorage.
 */

(function () {
  /* ----------------------------- Data Section ----------------------------- */
  // Category definitions. Each category has an id, a display name and an
  // optional parent. Top level categories have parent set to null.
  const categories = [
    { id: 'bicycles', name: 'Велосипеды', parent: null },
    { id: 'mountain', name: 'Горные', parent: 'bicycles' },
    { id: 'city', name: 'Городские', parent: 'bicycles' },
    { id: 'racing', name: 'Гоночные', parent: 'bicycles' },
    { id: 'hybrid', name: 'Гибридные', parent: 'bicycles' },
    { id: 'clothing', name: 'Одежда', parent: null },
    { id: 'accessories', name: 'Аксессуары', parent: null },
    { id: 'footwear', name: 'Обувь', parent: null },
    { id: 'equipment', name: 'Снаряжение', parent: null }
  ];

  // Product catalog. Each product belongs to a category and may have multiple
  // options (colour, size). For brevity the descriptions are concise. The
  // property `sale` marks items that are part of the clearance section and
  // automatically receive a discount. The property `popular` marks items for
  // the home page.
  const products = [
    {
      id: 'm1',
      name: 'Горный велосипед TrailX',
      category: 'mountain',
      price: 60000,
      weight: 10,
      options: { colour: ['черный', 'красный'], size: ['S', 'M', 'L'] },
      description: 'Надежный горный велосипед с амортизацией и прочной рамой.',
      image: 'images/mountain-bike.png',
      sale: false,
      popular: true
    },
    {
      id: 'm2',
      name: 'Горный велосипед Peak 200',
      category: 'mountain',
      price: 45000,
      weight: 12,
      options: { colour: ['синий', 'серый'], size: ['M', 'L'] },
      description: 'Универсальный велосипед для бездорожья и города.',
      image: 'images/mountain-bike.png',
      sale: true,
      popular: false
    },
    {
      id: 'c1',
      name: 'Городской велосипед UrbanGo',
      category: 'city',
      price: 30000,
      weight: 8,
      options: { colour: ['белый', 'зеленый'], size: ['M', 'L'] },
      description: 'Легкий и маневренный велосипед для городских поездок.',
      image: 'images/city-bike.png',
      sale: false,
      popular: true
    },
    {
      id: 'r1',
      name: 'Гоночный велосипед Speedster',
      category: 'racing',
      price: 80000,
      weight: 7,
      options: { colour: ['черный', 'белый'], size: ['S', 'M', 'L'] },
      description: 'Максимальная скорость и минимальный вес для настоящих гонщиков.',
      image: 'images/racing-bike.png',
      sale: false,
      popular: false
    },
    {
      id: 'h1',
      name: 'Гибридный велосипед Comet',
      category: 'hybrid',
      price: 35000,
      weight: 9,
      options: { colour: ['серебристый'], size: ['M', 'L'] },
      description: 'Совмещает преимущества дорожных и горных велосипедов.',
      image: 'images/hybrid-bike.png',
      sale: false,
      popular: false
    },
    {
      id: 'acc1',
      name: 'Шлем для велосипеда',
      category: 'accessories',
      price: 5000,
      weight: 0.5,
      options: { colour: ['черный', 'синий'], size: ['M', 'L'] },
      description: 'Легкий и прочный шлем для вашей безопасности.',
      image: 'images/helmet.png',
      sale: false,
      popular: false
    },
    {
      id: 'acc2',
      name: 'Велозамок',
      category: 'accessories',
      price: 1500,
      weight: 0.3,
      options: { colour: ['черный'], size: ['универсальный'] },
      description: 'Надежный замок для защиты вашего велосипеда.',
      image: 'images/lock.png',
      sale: false,
      popular: false
    },
    {
      id: 'foot1',
      name: 'Велотуфли',
      category: 'footwear',
      price: 8000,
      weight: 0.8,
      options: { size: ['38', '39', '40', '41', '42'] },
      description: 'Удобные туфли для профессиональной езды.',
      image: 'images/shoes.png',
      sale: true,
      popular: false
    },
    {
      id: 'cloth1',
      name: 'Джерси',
      category: 'clothing',
      price: 2500,
      weight: 0.2,
      options: { size: ['S', 'M', 'L'], colour: ['красный', 'синий'] },
      description: 'Дышащая велофутболка для комфорта во время поездок.',
      image: 'images/jersey.png',
      sale: false,
      popular: false
    }
  ];

  // Shipping and discount rules
  const SHIPPING_FREE_THRESHOLD = 7000;
  const SHIPPING_SMALL_LIMIT = 3; // weight in kg up to 3 kg cost 300
  const SHIPPING_MEDIUM_COST = 300;
  const SHIPPING_LARGE_COST = 500;
  const USER_DISCOUNT = 0.02; // 2%
  const SALE_DISCOUNT = 0.05; // 5%
  const COD_SURCHARGE = 0.05; // 5% extra for cash on delivery

  // Keys for localStorage
  const CART_KEY = 'bike_shop_cart';
  const USER_KEY = 'bike_shop_user';
  const SUBSCRIBERS_KEY = 'bike_shop_subscribers';

  /* --------------------------- Storage functions --------------------------- */
  function getCart() {
    try {
      const cart = JSON.parse(localStorage.getItem(CART_KEY));
      return Array.isArray(cart) ? cart : [];
    } catch (err) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function addToCart(productId, quantity = 1, options = {}) {
    const cart = getCart();
    const existing = cart.find(item => item.productId === productId && JSON.stringify(item.options) === JSON.stringify(options));
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({ productId, quantity, options });
    }
    saveCart(cart);
    updateCartCount();
    alert('Товар добавлен в корзину!');
  }

  function updateCartItem(index, quantity) {
    const cart = getCart();
    if (index >= 0 && index < cart.length) {
      cart[index].quantity = quantity;
      if (cart[index].quantity <= 0) {
        cart.splice(index, 1);
      }
      saveCart(cart);
      updateCartCount();
      renderCart();
    }
  }

  function removeCartItem(index) {
    const cart = getCart();
    cart.splice(index, 1);
    saveCart(cart);
    updateCartCount();
    renderCart();
  }

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY)) || null;
    } catch (err) {
      return null;
    }
  }

  function setCurrentUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function logOutUser() {
    localStorage.removeItem(USER_KEY);
    renderHeader();
  }

  function subscribeEmail(email) {
    const list = JSON.parse(localStorage.getItem(SUBSCRIBERS_KEY) || '[]');
    if (email && !list.includes(email)) {
      list.push(email);
      localStorage.setItem(SUBSCRIBERS_KEY, JSON.stringify(list));
      alert('Вы подписались на новости!');
    }
  }

  /* --------------------------- Helper functions --------------------------- */
  // Find category by id
  function findCategory(id) {
    return categories.find(cat => cat.id === id);
  }

  // Get products for a category (non-recursive)
  function getProductsByCategory(categoryId) {
    return products.filter(p => p.category === categoryId);
  }

  // Find a product by id
  function findProduct(id) {
    return products.find(p => p.id === id);
  }

  // Calculate totals including discounts and shipping
  function calculateCartTotals(selectedShipping, selectedPayment) {
    const cart = getCart();
    let subtotal = 0;
    let totalWeight = 0;
    cart.forEach(item => {
      const product = findProduct(item.productId);
      if (product) {
        let itemPrice = product.price;
        // sale discount
        if (product.sale) {
          itemPrice *= (1 - SALE_DISCOUNT);
        }
        subtotal += itemPrice * item.quantity;
        totalWeight += product.weight * item.quantity;
      }
    });
    // user discount
    const user = getCurrentUser();
    if (user) {
      subtotal *= (1 - USER_DISCOUNT);
    }
    // shipping cost
    let shippingCost = 0;
    if (selectedShipping === 'delivery') {
      // courier delivery: free if subtotal > threshold
      shippingCost = subtotal > SHIPPING_FREE_THRESHOLD ? 0 : SHIPPING_MEDIUM_COST;
    } else if (selectedShipping === 'mail') {
      // mail: depends on weight
      if (totalWeight <= SHIPPING_SMALL_LIMIT) shippingCost = SHIPPING_MEDIUM_COST;
      else shippingCost = SHIPPING_LARGE_COST;
    }
    // payment surcharge for COD on mail
    let codSurcharge = 0;
    if (selectedShipping === 'mail' && selectedPayment === 'cod') {
      codSurcharge = subtotal * COD_SURCHARGE;
    }
    const total = subtotal + shippingCost + codSurcharge;
    return { subtotal, shippingCost, codSurcharge, total };
  }

  // Update the cart count displayed in the header
  function updateCartCount() {
    const countEl = document.getElementById('cartCount');
    if (countEl) {
      const cart = getCart();
      const count = cart.reduce((sum, item) => sum + item.quantity, 0);
      countEl.textContent = count;
    }
  }

  /* --------------------------- Rendering functions --------------------------- */
  // Render the header with navigation, search, user and cart icons. This
  // function attaches event listeners for search and user actions.
  function renderHeader() {
    const header = document.querySelector('header');
    if (!header) return;
    const user = getCurrentUser();
    header.innerHTML = `
      <div class="container top-bar">
        <div class="logo"><a href="index.html">Go&amp;Ride</a></div>
        <nav>
          <ul>
            <li><a href="catalog.html">Каталог</a></li>
            <li><a href="#" id="contactLink">Контакты</a></li>
            <li><a href="#" id="reviewsLink">Отзывы</a></li>
            <li><a href="#" id="shippingLink">Доставка и оплата</a></li>
          </ul>
        </nav>
        <div class="actions">
          <form id="searchForm" action="catalog.html">
            <input type="search" id="searchInput" placeholder="Поиск">
          </form>
          <button id="userBtn" title="${user ? 'Выйти' : 'Войти / Регистрация'}">
            &#128100;
          </button>
          <button id="cartBtn" title="Корзина">
            &#128722;<span id="cartCount">0</span>
          </button>
        </div>
      </div>`;
    // Attach search form handler
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
      searchForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const term = document.getElementById('searchInput').value.trim();
        if (term) {
          // Save search term to localStorage and redirect to catalog
          localStorage.setItem('bike_shop_search_term', term);
          window.location.href = 'catalog.html#search';
        } else {
          window.location.href = 'catalog.html';
        }
      });
    }
    // User button
    const userBtn = document.getElementById('userBtn');
    if (userBtn) {
      userBtn.addEventListener('click', function () {
        if (user) {
          // logout
          if (confirm('Выйти из аккаунта?')) {
            logOutUser();
          }
        } else {
          // show login/register form
          showAuthModal();
        }
      });
    }
    // Cart button
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
      cartBtn.addEventListener('click', function () {
        window.location.href = 'cart.html';
      });
    }
    updateCartCount();
  }

  // Render the footer with some basic navigation links and a subscription form
  function renderFooter() {
    const footer = document.querySelector('footer');
    if (!footer) return;
    footer.innerHTML = `
      <div class="container columns">
        <div class="column">
          <h4>Категории</h4>
          <ul>
            <li><a href="catalog.html">Все товары</a></li>
            <li><a href="catalog.html#bicycles">Велосипеды</a></li>
            <li><a href="catalog.html#clothing">Одежда</a></li>
            <li><a href="catalog.html#accessories">Аксессуары</a></li>
            <li><a href="catalog.html#footwear">Обувь</a></li>
            <li><a href="catalog.html#equipment">Снаряжение</a></li>
          </ul>
        </div>
        <div class="column">
          <h4>Подписка</h4>
          <p>Введите e-mail, чтобы получать новости и скидки:</p>
          <form id="subscribeForm">
            <div class="form-group">
              <input type="email" id="subscribeEmail" placeholder="E-mail" required>
            </div>
            <button type="submit" class="btn btn-primary">Подписаться</button>
          </form>
        </div>
        <div class="column">
          <h4>Контакты</h4>
          <p>г. Москва, ул. Примерная, 1</p>
          <p>Тел.: +7 (495) 123-45-67</p>
          <div class="social-links">
            <a href="#" title="VK">&#x1F426;</a>
            <a href="#" title="Instagram">&#x1F4F7;</a>
            <a href="#" title="Telegram">&#x1F4E8;</a>
          </div>
        </div>
      </div>`;
    // Subscription form handler
    const subscribeForm = document.getElementById('subscribeForm');
    if (subscribeForm) {
      subscribeForm.addEventListener('submit', function (e) {
        e.preventDefault();
        const email = document.getElementById('subscribeEmail').value.trim();
        if (email) {
          subscribeEmail(email);
          subscribeForm.reset();
        }
      });
    }
  }

  // Render the home page. Shows a hero section, a list of popular products
  // and a sale block.
  function renderHome() {
    const main = document.querySelector('main');
    if (!main) return;
    const popular = products.filter(p => p.popular);
    const saleItems = products.filter(p => p.sale);
    main.innerHTML = `
      <section class="hero">
        <h1>Добро пожаловать в Go&amp;Ride</h1>
        <p>Лучший выбор велосипедов и аксессуаров для вас</p>
        <button class="btn-primary" onclick="window.location.href='catalog.html'">Перейти в каталог</button>
      </section>
      <section class="section">
        <h2>Популярные товары</h2>
        <div class="cards" id="popularContainer"></div>
      </section>
      <section class="section">
        <h2>Распродажа</h2>
        <div class="cards" id="saleContainer"></div>
      </section>`;
    // render cards
    const popularContainer = document.getElementById('popularContainer');
    const saleContainer = document.getElementById('saleContainer');
    popular.forEach(product => {
      popularContainer.appendChild(createProductCard(product));
    });
    saleItems.forEach(product => {
      saleContainer.appendChild(createProductCard(product));
    });
  }

  // Render the catalog page. Shows category sections with sliders and a block
  // for search results if a search term is provided.
  function renderCatalog() {
    const main = document.querySelector('main');
    if (!main) return;
    const hash = window.location.hash.replace('#', '');
    // Check for search term saved in localStorage
    const searchTerm = localStorage.getItem('bike_shop_search_term');
    let content = '';
    if (hash && findCategory(hash)) {
      // Specific category view
      const cat = findCategory(hash);
      content += `<section class="section"><h2>${cat.name}</h2><div class="cards" id="cat-${hash}"></div></section>`;
    } else if (searchTerm && window.location.hash === '#search') {
      // Search results view
      content += `<section class="section"><h2>Результаты поиска по запросу "${searchTerm}"</h2><div class="cards" id="searchResults"></div></section>`;
    } else {
      // Show all top-level categories
      const topCats = categories.filter(c => c.parent === null);
      topCats.forEach(cat => {
        content += `<section class="section"><h2>${cat.name}</h2><div class="cards" id="cat-${cat.id}"></div></section>`;
      });
    }
    main.innerHTML = content;
    // Render category or search content
    if (hash && findCategory(hash)) {
      const container = document.getElementById(`cat-${hash}`);
      const items = products.filter(p => p.category === hash);
      items.forEach(product => {
        container.appendChild(createProductCard(product));
      });
    } else if (searchTerm && window.location.hash === '#search') {
      const container = document.getElementById('searchResults');
      const termLower = searchTerm.toLowerCase();
      const items = products.filter(p => p.name.toLowerCase().includes(termLower));
      items.forEach(product => {
        container.appendChild(createProductCard(product));
      });
      // clear search term after displaying results
      localStorage.removeItem('bike_shop_search_term');
    } else {
      const topCats = categories.filter(c => c.parent === null);
      topCats.forEach(cat => {
        const container = document.getElementById(`cat-${cat.id}`);
        // For bicycles category display children categories merged
        let catProducts;
        if (cat.id === 'bicycles') {
          const subCats = categories.filter(sc => sc.parent === 'bicycles').map(sc => sc.id);
          catProducts = products.filter(p => subCats.includes(p.category));
        } else {
          catProducts = products.filter(p => p.category === cat.id);
        }
        catProducts.forEach(product => {
          container.appendChild(createProductCard(product));
        });
      });
    }
  }

  // Render a specific section page (alias for catalog with hash)
  function renderSection() {
    renderCatalog();
  }

  // Render product detail page using the id from the query string (?id=)
  function renderProduct() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const product = findProduct(id);
    const main = document.querySelector('main');
    if (!product || !main) {
      main.innerHTML = '<p>Товар не найден</p>';
      return;
    }
    let optionsHtml = '';
    // Render colour options
    if (product.options && product.options.colour) {
      optionsHtml += '<label>Цвет<select id="optionColour">';
      product.options.colour.forEach(col => {
        optionsHtml += `<option value="${col}">${col}</option>`;
      });
      optionsHtml += '</select></label>';
    }
    // Render size options
    if (product.options && product.options.size) {
      optionsHtml += '<label>Размер<select id="optionSize">';
      product.options.size.forEach(size => {
        optionsHtml += `<option value="${size}">${size}</option>`;
      });
      optionsHtml += '</select></label>';
    }
    main.innerHTML = `
      <section class="section">
        <div class="product-detail">
          <div class="images">
            <img src="${product.image}" alt="${product.name}">
          </div>
          <div class="info">
            <h1>${product.name}</h1>
            <p class="price">${formatPrice(product.price)} ${product.sale ? '<small>(скидка 5%)</small>' : ''}</p>
            <p>${product.description}</p>
            ${optionsHtml}
            <label>Количество
              <input type="number" id="productQty" value="1" min="1">
            </label>
            <button id="addToCartBtn">Добавить в корзину</button>
          </div>
        </div>
      </section>
    `;
    // Attach event to Add to Cart button
    const addBtn = document.getElementById('addToCartBtn');
    if (addBtn) {
      addBtn.addEventListener('click', function () {
        const qty = parseInt(document.getElementById('productQty').value, 10) || 1;
        const options = {};
        const colourSelect = document.getElementById('optionColour');
        const sizeSelect = document.getElementById('optionSize');
        if (colourSelect) options.colour = colourSelect.value;
        if (sizeSelect) options.size = sizeSelect.value;
        addToCart(product.id, qty, options);
      });
    }
  }

  // Render the cart page. Shows all items, allows updating quantities,
  // removing items and proceeding to checkout.
  function renderCart() {
    const main = document.querySelector('main');
    if (!main) return;
    const cart = getCart();
    if (cart.length === 0) {
      main.innerHTML = '<section class="section"><h2>Корзина</h2><p>Ваша корзина пуста.</p></section>';
      return;
    }
    let tableRows = '';
    cart.forEach((item, index) => {
      const product = findProduct(item.productId);
      if (product) {
        // Calculate price with sale
        let price = product.price;
        if (product.sale) price *= (1 - SALE_DISCOUNT);
        const rowTotal = price * item.quantity;
        tableRows += `
          <tr>
            <td>${product.name}</td>
            <td>${formatPrice(price)}</td>
            <td><input type="number" min="1" value="${item.quantity}" data-index="${index}" class="cartQtyInput"></td>
            <td>${formatPrice(rowTotal)}</td>
            <td><button data-index="${index}" class="btn btn-secondary removeItemBtn">Удалить</button></td>
          </tr>`;
      }
    });
    main.innerHTML = `
      <section class="section">
        <h2>Корзина</h2>
        <table class="cart-table">
          <thead>
            <tr><th>Товар</th><th>Цена</th><th>Количество</th><th>Сумма</th><th></th></tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <div class="cart-summary" id="cartSummary"></div>
        <div class="cart-actions">
          <button class="btn btn-secondary" onclick="window.location.href='catalog.html'">Продолжить покупки</button>
          <button class="btn btn-primary" onclick="window.location.href='checkout.html'">Оформить заказ</button>
        </div>
      </section>`;
    // Attach events for quantity inputs and remove buttons
    document.querySelectorAll('.cartQtyInput').forEach(input => {
      input.addEventListener('change', function (e) {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        const newQty = parseInt(e.target.value, 10);
        updateCartItem(idx, newQty);
      });
    });
    document.querySelectorAll('.removeItemBtn').forEach(btn => {
      btn.addEventListener('click', function (e) {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        removeCartItem(idx);
      });
    });
    // Render summary
    updateCartSummary('delivery', 'card');
  }

  // Update the cart summary section. Accepts selected shipping and payment options
  // so that totals can be recalculated in real time.
  function updateCartSummary(shippingMethod, paymentMethod) {
    const summaryEl = document.getElementById('cartSummary');
    if (!summaryEl) return;
    const totals = calculateCartTotals(shippingMethod, paymentMethod);
    summaryEl.innerHTML = `
      <p>Подытог: ${formatPrice(totals.subtotal)}</p>
      <p>Доставка: ${formatPrice(totals.shippingCost)}</p>
      ${totals.codSurcharge > 0 ? `<p>Наложенный платеж: ${formatPrice(totals.codSurcharge)}</p>` : ''}
      <p class="total">Итого: ${formatPrice(totals.total)}</p>
    `;
  }

  // Render the checkout page. Presents a form for shipping and payment and
  // summarises the order. On submission the cart is cleared and the user
  // receives a confirmation.
  function renderCheckout() {
    const main = document.querySelector('main');
    if (!main) return;
    const cart = getCart();
    if (cart.length === 0) {
      main.innerHTML = '<section class="section"><h2>Оформление заказа</h2><p>Ваша корзина пуста.</p></section>';
      return;
    }
    main.innerHTML = `
      <section class="section">
        <h2>Оформление заказа</h2>
        <form id="checkoutForm">
          <div class="form-group">
            <label>Имя</label>
            <input type="text" id="checkoutName" required>
          </div>
          <div class="form-group">
            <label>Адрес</label>
            <input type="text" id="checkoutAddress" required>
          </div>
          <div class="form-group">
            <label>Телефон</label>
            <input type="tel" id="checkoutPhone" required>
          </div>
          <div class="form-group">
            <label>Способ доставки</label>
            <select id="checkoutShipping">
              <option value="delivery">Курьером</option>
              <option value="mail">Почтой России</option>
            </select>
          </div>
          <div class="form-group">
            <label>Способ оплаты</label>
            <select id="checkoutPayment">
              <option value="card">Банковская карта</option>
              <option value="cod">Наложенный платеж</option>
              <option value="invoice">Безналичный расчет (счет)</option>
            </select>
          </div>
          <div class="cart-summary" id="checkoutSummary"></div>
          <button type="submit" class="btn btn-primary">Подтвердить заказ</button>
        </form>
      </section>
    `;
    // Update summary initially
    const shippingSelect = document.getElementById('checkoutShipping');
    const paymentSelect = document.getElementById('checkoutPayment');
    function updateSummary() {
      const totals = calculateCartTotals(shippingSelect.value, paymentSelect.value);
      const summaryEl = document.getElementById('checkoutSummary');
      summaryEl.innerHTML = `
        <p>Подытог: ${formatPrice(totals.subtotal)}</p>
        <p>Доставка: ${formatPrice(totals.shippingCost)}</p>
        ${totals.codSurcharge > 0 ? `<p>Наложенный платеж: ${formatPrice(totals.codSurcharge)}</p>` : ''}
        <p class="total">Итого: ${formatPrice(totals.total)}</p>
      `;
    }
    shippingSelect.addEventListener('change', updateSummary);
    paymentSelect.addEventListener('change', updateSummary);
    updateSummary();
    // Handle form submission
    const checkoutForm = document.getElementById('checkoutForm');
    checkoutForm.addEventListener('submit', function (e) {
      e.preventDefault();
      // Here we would send data to the server. In this demo we simply clear the cart.
      saveCart([]);
      updateCartCount();
      main.innerHTML = '<section class="section"><h2>Спасибо за заказ!</h2><p>Ваш заказ оформлен. Мы свяжемся с вами для подтверждения.</p></section>';
    });
  }

  // Create a DOM element representing a product card. Used in catalog and home
  // pages. Each card links to the product detail page.
  function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <div class="card-body">
        <h3>${product.name}</h3>
        <p class="price">${formatPrice(product.sale ? product.price * (1 - SALE_DISCOUNT) : product.price)}</p>
        ${product.sale ? '<p class="badge">Скидка 5%</p>' : ''}
        <button onclick="window.location.href='product.html?id=${product.id}'">Подробнее</button>
      </div>
    `;
    return card;
  }

  // Format numbers as currency (rubles). Adds spaces as thousands separator.
  function formatPrice(value) {
    return value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ₽';
  }

  // Show a simple modal for authentication (login/register). For brevity the
  // modal is implemented as a prompt-based flow.
  function showAuthModal() {
    const action = prompt('Введите 1 для входа, 2 для регистрации:', '1');
    if (action === '1') {
      const email = prompt('E-mail:');
      const name = prompt('Ваше имя:');
      if (email && name) {
        setCurrentUser({ email, name });
        alert('Вы успешно вошли!');
        renderHeader();
      }
    } else if (action === '2') {
      const email = prompt('E-mail:');
      const name = prompt('Ваше имя:');
      if (email && name) {
        setCurrentUser({ email, name });
        alert('Регистрация прошла успешно!');
        renderHeader();
      }
    }
  }

  /* -------------------------- Page initialisation -------------------------- */
  // Initialise a page by rendering header, footer and specific content based on
  // the provided type. The type corresponds to the page filename without
  // extension (index, catalog, section, product, cart, checkout).
  function initPage(pageType) {
    renderHeader();
    renderFooter();
    switch (pageType) {
      case 'index':
        renderHome();
        break;
      case 'catalog':
        renderCatalog();
        break;
      case 'section':
        renderSection();
        break;
      case 'product':
        renderProduct();
        break;
      case 'cart':
        renderCart();
        break;
      case 'checkout':
        renderCheckout();
        break;
    }
  }

  // Expose functions globally for HTML inline handlers
  window.initPage = initPage;
  window.addToCart = addToCart;
  window.updateCartItem = updateCartItem;
  window.removeCartItem = removeCartItem;
  window.calculateCartTotals = calculateCartTotals;
  window.updateCartCount = updateCartCount;
})();