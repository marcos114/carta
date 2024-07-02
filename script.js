let currentUser = '';
let tables = {};
let tableCounter = 0;

function login() {
    const usernameInput = document.getElementById('username');
    currentUser = usernameInput.value;
    if (currentUser) {
        document.getElementById('login').style.display = 'none';
        document.getElementById('main').style.display = 'block';
        document.getElementById('user').textContent = currentUser;
    }
}

function addTable() {
    const tableId = `table-${Date.now()}`;
    tableCounter += 1;
    tables[tableId] = {
        user: currentUser,
        number: tableCounter,
        orders: [],
        drinks: [],
        total: 0,
        isFoodTableVisible: true
    };
    renderTables();
}

function addDish(tableId, dishName, quantityType) {
    const table = tables[tableId];
    const dish = table.orders.find(order => order.name === dishName);
    if (dish) {
        dish[quantityType] += 1;
    } else {
        table.orders.push({ name: dishName, whole: 0, half: 0 });
        table.orders.find(order => order.name === dishName)[quantityType] += 1;
    }
    calculateTotal(tableId);
    renderTables();
}

function removeDish(tableId, dishName, quantityType) {
    const table = tables[tableId];
    const dish = table.orders.find(order => order.name === dishName);
    if (dish && dish[quantityType] > 0) {
        dish[quantityType] -= 1;
    }
    calculateTotal(tableId);
    renderTables();
}

function addDrink(tableId, drinkName) {
    const table = tables[tableId];
    const drink = table.drinks.find(order => order.name === drinkName);
    if (drink) {
        drink.quantity += 1;
    } else {
        table.drinks.push({ name: drinkName, quantity: 1 });
    }
    calculateTotal(tableId);
    renderTables();
}

function removeDrink(tableId, drinkName) {
    const table = tables[tableId];
    const drink = table.drinks.find(order => order.name === drinkName);
    if (drink && drink.quantity > 0) {
        drink.quantity -= 1;
    }
    calculateTotal(tableId);
    renderTables();
}

function calculateTotal(tableId) {
    const table = tables[tableId];
    let total = 0;
    table.orders.forEach(order => {
        total += (order.whole * 6) + (order.half * 4);
    });
    table.drinks.forEach(order => {
        total += (order.name === 'Refresco' || order.name === 'Agua') ? (order.quantity * 1.5) : (order.quantity * 2);
    });
    table.total = total;
}

function finalizeTable(tableId) {
    const table = tables[tableId];
    calculateTotal(tableId);
    saveTableData(table);
    delete tables[tableId];
    renderTables();
}

function saveTableData(tableData) {
    const foodOrders = tableData.orders.map(order => ({
        'Plato': order.name,
        'Cantidad Entera': order.whole,
        'Cantidad Media': order.half,
        'Precio Unitario': 6,
        'Precio Medio': 4
    }));

    const drinkOrders = tableData.drinks.map(drink => ({
        'Bebida': drink.name,
        'Cantidad': drink.quantity,
        'Precio Unitario': (drink.name === 'Refresco' || drink.name === 'Agua') ? 1.5 : 2
    }));

    const total = [['', '', '', 'Total:', tableData.total]];

    const foodSheet = XLSX.utils.json_to_sheet(foodOrders);
    const drinkSheet = XLSX.utils.json_to_sheet(drinkOrders);

    XLSX.utils.sheet_add_aoa(foodSheet, total, { origin: -1 });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, foodSheet, 'Comida');
    XLSX.utils.book_append_sheet(workbook, drinkSheet, 'Bebidas');

    const workbookBlob = XLSX.write(workbook, { bookType: 'xlsx', type: 'blob' });

    const a = document.createElement('a');
    a.href = URL.createObjectURL(workbookBlob);
    a.download = `mesa-${tableData.number}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function toggleTable(tableId) {
    const table = tables[tableId];
    table.isFoodTableVisible = !table.isFoodTableVisible;
    renderTables();
}

function renderTables() {
    const tablesContainer = document.getElementById('tables');
    tablesContainer.innerHTML = '';
    for (const [tableId, table] of Object.entries(tables)) {
        const tableElement = document.createElement('div');
        tableElement.className = 'table';
        tableElement.id = tableId;
        
        const tableHeader = document.createElement('h2');
        tableHeader.textContent = `Mesa de ${table.user}`;
        tableElement.appendChild(tableHeader);

        const tableNumber = document.createElement('div');
        tableNumber.className = 'table-number';
        tableNumber.textContent = `Mesa ${table.number}`;
        tableElement.appendChild(tableNumber);
        
        const toggleButton = document.createElement('button');
        toggleButton.textContent = 'Alternar entre Comida y Bebida';
        toggleButton.onclick = (event) => {
            event.stopPropagation();
            toggleTable(tableId);
        };
        tableElement.appendChild(toggleButton);
        
        const foodTable = document.createElement('table');
        foodTable.className = 'dish-table food-table';
        foodTable.style.display = table.isFoodTableVisible ? 'table' : 'none';
        
        const tableHead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Plato</th>
            <th>1</th>
            <th>1/2</th>
        `;
        tableHead.appendChild(headerRow);
        foodTable.appendChild(tableHead);
        
        const tableBody = document.createElement('tbody');
        const dishes = ['Boquerones', 'Bacalailla', 'Gambas PL', 'Sardinas', 'Puntillitas', 'Bacalao'];
        
        dishes.forEach(dishName => {
            const dishRow = document.createElement('tr');
            
            const dishNameCell = document.createElement('td');
            dishNameCell.textContent = dishName;
            dishRow.appendChild(dishNameCell);
            
            const dishWhole = table.orders.find(order => order.name === dishName);
            const wholeQuantity = dishWhole ? dishWhole.whole : 0;
            const halfQuantity = dishWhole ? dishWhole.half : 0;
            
            const wholeCell = document.createElement('td');
            wholeCell.innerHTML = `
                <span>${wholeQuantity}</span>
                <button onclick="addDish('${tableId}', '${dishName}', 'whole')">+</button>
                <button onclick="removeDish('${tableId}', '${dishName}', 'whole')">-</button>
            `;
            dishRow.appendChild(wholeCell);
            
            const halfCell = document.createElement('td');
            halfCell.innerHTML = `
                <span>${halfQuantity}</span>
                <button onclick="addDish('${tableId}', '${dishName}', 'half')">+</button>
                <button onclick="removeDish('${tableId}', '${dishName}', 'half')">-</button>
            `;
            dishRow.appendChild(halfCell);
            
            tableBody.appendChild(dishRow);
        });
        
        foodTable.appendChild(tableBody);
        tableElement.appendChild(foodTable);
        
        const drinkTable = document.createElement('table');
        drinkTable.className = 'drink-table';
        drinkTable.style.display = table.isFoodTableVisible ? 'none' : 'table';
        
        const drinkHead = document.createElement('thead');
        const drinkHeaderRow = document.createElement('tr');
        drinkHeaderRow.innerHTML = `
            <th>Bebida</th>
            <th>Cantidad</th>
        `;
        drinkHead.appendChild(drinkHeaderRow);
        drinkTable.appendChild(drinkHead);
        
        const drinkBody = document.createElement('tbody');
        const drinks = ['Refresco', 'Cerveza', 'Tinto', 'Agua', 'Café', 'Vino'];
        
        drinks.forEach(drinkName => {
            const drinkRow = document.createElement('tr');
            
            const drinkNameCell = document.createElement('td');
            drinkNameCell.textContent = drinkName;
            drinkRow.appendChild(drinkNameCell);
            
            const drink = table.drinks.find(order => order.name === drinkName);
            const drinkQuantity = drink ? drink.quantity : 0;
            
            const drinkQuantityCell = document.createElement('td');
            drinkQuantityCell.innerHTML = `
                <span>${drinkQuantity}</span>
                <button onclick="addDrink('${tableId}', '${drinkName}')">+</button>
                <button onclick="removeDrink('${tableId}', '${drinkName}')">-</button>
            `;
            drinkRow.appendChild(drinkQuantityCell);
            
            drinkBody.appendChild(drinkRow);
        });
        
        drinkTable.appendChild(drinkBody);
        tableElement.appendChild(drinkTable);
        
        const totalElement = document.createElement('div');
        totalElement.className = 'table-total';
        totalElement.textContent = `Total: €${table.total.toFixed(2)}`;
        tableElement.appendChild(totalElement);
        
        const finalizeButton = document.createElement('button');
        finalizeButton.textContent = 'Terminar Mesa';
        finalizeButton.onclick = () => finalizeTable(tableId);
        tableElement.appendChild(finalizeButton);
        
        tablesContainer.appendChild(tableElement);
    }
}
