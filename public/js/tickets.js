// Handle create ticket form submission (MUST be outside the modal creation function)
async function handleCreateTicket(event) {
  event.preventDefault();

  try {
    const formData = new FormData(event.target);
    const ticketData = {
      command: formData.get('command'),
      unit: formData.get('unit'),
      priority: formData.get('priority') || 'רגילה',
      description: formData.get('description'),
      subject: formData.get('subject'),
      isRecurring: formData.get('isRecurring') === 'on'
    };

    if (typeof showLoading === 'function') {
      showLoading('יוצר תקלה...');
    }

    const result = await apiCall('/tickets', {
      method: 'POST',
      body: JSON.stringify(ticketData)
    });

    if (typeof showSuccess === 'function') {
      showSuccess(result.message);
    }
    if (typeof hideModal === 'function') {
      hideModal('create-ticket-modal');
    }

    // Refresh tickets list or navigate
    window.location.href = '/tickets';

  } catch (error) {
    console.error('Create ticket error:', error);
    if (typeof showError === 'function') {
      showError(error.message || 'שגיאה ביצירת התקלה');
    }
  } finally {
    if (typeof hideLoading === 'function') {
      hideLoading();
    }
  }
}

// Modal show/hide functions
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'flex';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    modal.remove(); // Clean up the modal
  }
}

// Load units based on selected command
function loadUnitsForCommand(commandName, unitSelectId) {
  const unitSelect = document.getElementById(unitSelectId);
  if (!unitSelect) return;

  // Clear existing units
  unitSelect.innerHTML = '<option value="">בחר יחידה</option>';

  // Define units per command
  const unitsByCommand = {
    'פיקוד הצפון': [
      'אוגדה 36',
      'חטיבת גולני',
      'חטיבת צנחנים',
      'יחידת 8200',
      'בסיס רמת דוד'
    ],
    'פיקוד המרכז': [
      'חטיבת גבעתי',
      'חטיבת נחל',
      'מחנה שלום',
      'בסיס צריפין'
    ],
    'פיקוד הדרום': [
      'אוגדה 143',
      'חטיבת הנגב',
      'יחידת שחר',
      'בסיס צאלים'
    ],
    'פיקוד העורף': [
      'מחוז צפון',
      'מחוז מרכז',
      'מחוז דרום',
      'יחידת פיקוד ובקרה'
    ],
    'זרוע היבשה': [
      'חיל השריון',
      'חיל רגלים',
      'חיל ארטילריה',
      'חיל הנדסה'
    ],
    'חיל האוויר': [
      'בסיס חצרים',
      'בסיס נבטים',
      'בסיס רמת דוד',
      'יחידת שלדג'
    ],
    'חיל הים': [
      'בסיס אשדוד',
      'בסיס חיפה',
      'בסיס אילת',
      'יחידת שייטת 13'
    ]
  };

  const units = unitsByCommand[commandName] || [];
  units.forEach(unit => {
    const option = document.createElement('option');
    option.value = unit;
    option.textContent = unit;
    unitSelect.appendChild(option);
  });
}

function createCreateTicketModal() {
  console.log('createCreateTicketModal called');

  // Remove existing modal if any
  const existingModal = document.getElementById('create-ticket-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'create-ticket-modal';
  modal.className = 'modal';
  modal.innerHTML = `<div class="modal-content">
  <div class="modal-header">
    <h2 class="modal-title">יצירת תקלה חדשה</h2>
    <span class="close" onclick="hideModal('create-ticket-modal')">&times;</span>
  </div>
  <div class="modal-body">
    <form id="create-ticket-form" onsubmit="handleCreateTicket(event)">
  <div class="form-group">
    <label for="ticket-subject">נושא התקלה *</label>
    <input type="text" id="ticket-subject" name="subject" class="form-control" required placeholder="נושא קצר לתקלה">
  </div>
      <div class="form-group">
        <label for="ticket-command">פיקוד *</label>
        <select id="ticket-command" name="command" class="form-control" required onchange="loadUnitsForCommand(this.value, 'ticket-unit')">
          <option value="">בחר פיקוד</option>
          <option value="פיקוד הצפון">פיקוד הצפון</option>
          <option value="פיקוד המרכז">פיקוד המרכז</option>
          <option value="פיקוד הדרום">פיקוד הדרום</option>
          <option value="פיקוד העורף">פיקוד העורף</option>
          <option value="זרוע היבשה">זרוע היבשה</option>
          <option value="חיל האוויר">חיל האוויר</option>
          <option value="חיל הים">חיל הים</option>
        </select>
      </div>
      <div class="form-group">
        <label for="ticket-unit">יחידה *</label>
        <select id="ticket-unit" name="unit" class="form-control" required>
          <option value="">בחר יחידה</option>
        </select>
      </div>
      <div class="form-group">
        <label for="ticket-priority">עדיפות *</label>
        <select id="ticket-priority" name="priority" class="form-control" required>
          <option value="רגילה">רגילה</option>
          <option value="דחופה">דחופה</option>
          <option value="מבצעית">מבצעית</option>
        </select>
      </div>
      <div class="form-group">
        <label for="ticket-description">תיאור התקלה *</label>
        <textarea id="ticket-description" name="description" class="form-control" rows="4" required placeholder="תאר את התקלה בפירוט..."></textarea>
      </div>
      <div class="form-group">
        <label>
          <input type="checkbox" id="ticket-recurring" name="isRecurring">
          תקלה חוזרת
        </label>
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-primary">יצירת תקלה</button>
        <button type="button" class="btn btn-secondary" onclick="hideModal('create-ticket-modal')">ביטול</button>
      </div>
    </form>
  </div>
</div>`;

  document.body.appendChild(modal);
  console.log('Modal added to body');

  // Show modal using our custom function
  showModal('create-ticket-modal');
}

function showCreateTicketForm() {
  console.log('showCreateTicketForm called');
  const modal = document.getElementById('create-ticket-modal');
  if (!modal) {
    console.log('Creating new create ticket modal');
    createCreateTicketModal();
  } else {
    console.log('Showing existing create ticket modal');
    showModal('create-ticket-modal');
  }
}

// Close modal when clicking outside of it
window.onclick = function(event) {
  const modal = document.getElementById('create-ticket-modal');
  if (event.target === modal) {
    hideModal('create-ticket-modal');
  }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    const modal = document.getElementById('create-ticket-modal');
    if (modal && modal.style.display === 'flex') {
      hideModal('create-ticket-modal');
    }
  }
});

// Get current user data
async function getCurrentUser() {
  try {
    const response = await apiCall('/auth/me');
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

// Create and show a modal to view ticket details
function createViewModal(ticket) {
  const modalId = `view-ticket-modal-${ticket._id}`;
  const existingModal = document.getElementById(modalId);
  if (existingModal) {
    existingModal.remove();
  }

  const modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">פרטי תקלה #${ticket.ticketNumber}</h2>
        <span class="close" onclick="hideModal('${modalId}')">&times;</span>
      </div>
      <div class="modal-body">
        <p><strong>נושא:</strong> ${ticket.subject}</p>
        <p><strong>פיקוד:</strong> ${ticket.command}</p>
        <p><strong>יחידה:</strong> ${ticket.unit}</p>
        <p><strong>עדיפות:</strong> ${ticket.priority}</p>
        <p><strong>תיאור:</strong> ${ticket.description}</p>
        <p><strong>סטטוס:</strong> ${ticket.status}</p>
        <p><strong>נפתחה בתאריך:</strong> ${new Date(ticket.openDate).toLocaleString()}</p>
        <p><strong>תקלה חוזרת:</strong> ${ticket.isRecurring ? 'כן' : 'לא'}</p>
        <p><strong>נוצרה על ידי:</strong> ${ticket.createdBy}</p>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" onclick="hideModal('${modalId}')">סגור</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  showModal(modalId);
}

// Handle in-screen quick edit for a ticket
function handleEditTicket(ticketId, ticketCard) {
  const fieldsToEdit = {
    subject: 'input',
    description: 'textarea',
    priority: 'select',
    status: 'select'
  };

  Object.keys(fieldsToEdit).forEach(field => {
    const element = ticketCard.querySelector(`[data-field="${field}"]`);
    if (element) {
      const currentValue = element.textContent;
      let inputElement;

      if (fieldsToEdit[field] === 'select') {
        inputElement = document.createElement('select');
        inputElement.className = 'form-control';
        const options = field === 'priority' ? ['רגילה', 'דחופה', 'מבצעית'] : ['פתוח', 'בטיפול', 'תוקן'];
        options.forEach(opt => {
          const option = document.createElement('option');
          option.value = opt;
          option.textContent = opt;
          if (opt === currentValue) {
            option.selected = true;
          }
          inputElement.appendChild(option);
        });
      } else if (fieldsToEdit[field] === 'textarea') {
        inputElement = document.createElement('textarea');
        inputElement.className = 'form-control';
        inputElement.rows = 3;
        inputElement.value = currentValue;
      } else {
        inputElement = document.createElement('input');
        inputElement.type = 'text';
        inputElement.className = 'form-control';
        inputElement.value = currentValue;
      }

      inputElement.dataset.originalValue = currentValue;
      element.innerHTML = '';
      element.appendChild(inputElement);
    }
  });

  const actions = ticketCard.querySelector('.ticket-actions');
  actions.innerHTML = `
    <button class="btn btn-sm btn-success save-button">שמור</button>
    <button class="btn btn-sm btn-secondary cancel-button">בטל</button>
  `;

  actions.querySelector('.save-button').addEventListener('click', async () => {
    const updatedData = {};
    let hasChanges = false;
    Object.keys(fieldsToEdit).forEach(field => {
      const element = ticketCard.querySelector(`[data-field="${field}"]`);
      if (element) {
        const input = element.querySelector('input, select, textarea');
        if (input && input.value !== input.dataset.originalValue) {
          updatedData[field] = input.value;
          hasChanges = true;
        }
      }
    });

    if (!hasChanges) {
      // If no changes, just revert to original state
      window.location.reload(); // Or a function to revert fields
      return;
    }

    try {
      showLoading('מעדכן תקלה...');
      const response = await apiCall(`/tickets/${ticketId}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      });
      hideLoading();

      if (response.success) {
        showSuccess('התקלה עודכנה בהצלחה');
        // Update fields in place
        Object.keys(updatedData).forEach(field => {
          const element = ticketCard.querySelector(`[data-field="${field}"]`);
          if (element) {
            element.innerHTML = ''; // Clear the input
            element.textContent = updatedData[field];
          }
        });
        // Restore original buttons
        actions.innerHTML = `
          <button class="btn btn-sm btn-info view-button">צפה</button>
          <button class="btn btn-sm btn-warning edit-button">ערוך</button>
        `;
        // Re-add event listeners
        const newEditButton = actions.querySelector('.edit-button');
        if (newEditButton) {
            newEditButton.addEventListener('click', () => handleEditTicket(ticketId, ticketCard));
        }
        const newViewButton = actions.querySelector('.view-button');
        if(newViewButton) {
            // Update the stored ticket data
            const updatedTicket = { ...JSON.parse(ticketCard.dataset.ticket), ...updatedData };
            ticketCard.dataset.ticket = JSON.stringify(updatedTicket);
            newViewButton.addEventListener('click', () => createViewModal(updatedTicket));
        }
      } else {
        showError(response.message || 'שגיאה בעדכון התקלה');
      }
    } catch (error) {
      hideLoading();
      showError(error.message || 'שגיאה בעדכון התקלה');
    }
  });

  actions.querySelector('.cancel-button').addEventListener('click', () => {
    // Revert fields to original values
    Object.keys(fieldsToEdit).forEach(field => {
      const element = ticketCard.querySelector(`[data-field="${field}"]`);
      if (element) {
        const input = element.querySelector('input, select, textarea');
        if (input) {
          element.innerHTML = '';
          element.textContent = input.dataset.originalValue;
        }
      }
    });
    // Restore original buttons
    actions.innerHTML = `
      <button class="btn btn-sm btn-info view-button">צפה</button>
      <button class="btn btn-sm btn-warning edit-button">ערוך</button>
    `;
    // Re-add event listeners
    const newEditButton = actions.querySelector('.edit-button');
    if (newEditButton) {
        newEditButton.addEventListener('click', () => handleEditTicket(ticketId, ticketCard));
    }
    const newViewButton = actions.querySelector('.view-button');
    if(newViewButton) {
        const ticket = JSON.parse(ticketCard.dataset.ticket);
        newViewButton.addEventListener('click', () => createViewModal(ticket));
    }
  });
}

function createTicketCard(ticket, user) {
  const card = document.createElement('div');
  card.className = 'ticket-card';
  card.dataset.ticketId = ticket._id;
  card.dataset.ticket = JSON.stringify(ticket);

  const isAdminOrTech = user && (user.role === 'admin' || user.role === 'technician');

  card.innerHTML = `
    <div class="ticket-header">
      <h5 class="ticket-subject" data-field="subject">${ticket.subject}</h5>
      <span class="ticket-number">#${ticket.ticketNumber}</span>
    </div>
    <div class="ticket-body">
      <p class="ticket-description" data-field="description">${ticket.description}</p>
      <div class="ticket-meta">
        <span><strong>פיקוד:</strong> ${ticket.command}</span>
        <span><strong>יחידה:</strong> ${ticket.unit}</span>
        <span data-field="priority"><strong>עדיפות:</strong> ${ticket.priority}</span>
        <span data-field="status"><strong>סטטוס:</strong> ${ticket.status}</span>
      </div>
    </div>
    <div class="ticket-actions">
      <button class="btn btn-sm btn-info view-button">צפה</button>
      ${isAdminOrTech ? '<button class="btn btn-sm btn-warning edit-button">ערוך</button>' : ''}
    </div>
  `;

  card.querySelector('.view-button').addEventListener('click', () => {
    createViewModal(ticket);
  });

  if (isAdminOrTech) {
    const editButton = card.querySelector('.edit-button');
    if (editButton) {
      editButton.addEventListener('click', () => {
        handleEditTicket(ticket._id, card);
      });
    }
  }

  return card;
}

async function loadTickets() {
  try {
    showLoading('טוען תקלות...');
    const [user, ticketsResponse] = await Promise.all([
      getCurrentUser(),
      apiCall('/tickets')
    ]);

    hideLoading();

    if (!ticketsResponse.success) {
      showError(ticketsResponse.message);
      return;
    }

    const tickets = ticketsResponse.data.tickets;
    const ticketsContainer = document.getElementById('tickets-container');
    if (ticketsContainer) {
      ticketsContainer.innerHTML = '';
      if (tickets.length === 0) {
        ticketsContainer.innerHTML = '<p>לא נמצאו תקלות.</p>';
        return;
      }
      tickets.forEach(ticket => {
        const ticketCard = createTicketCard(ticket, user);
        ticketsContainer.appendChild(ticketCard);
      });
    }
  } catch (error) {
    hideLoading();
    showError(error.message || 'שגיאה בטעינת התקלות');
  }
}

// Initial load
document.addEventListener('DOMContentLoaded', () => {
  loadTickets();
});

// Placeholder functions
// NOTE: Replace these with your actual implementations
function showLoading(message) {
  console.log('Loading:', message);
}

function hideLoading() {
  console.log('Loading hidden');
}

function showSuccess(message) {
  console.log('Success:', message);
  alert(`Success: ${message}`);
}

function showError(message) {
  console.error('Error:', message);
  alert(`Error: ${message}`);
}

async function apiCall(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const config = {
    method: options.method || 'GET',
    headers,
    ...options,
  };

  if (options.body) {
    config.body = options.body;
  }

  try {
    const response = await fetch(`/api${endpoint}`, config);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'API call failed');
    }
    return data;
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
}
