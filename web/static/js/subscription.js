// Subscription Module
(function() {
    // DOM Elements
    const subscribeBtn = document.getElementById('subscribeBtn');
    const modal = document.getElementById('subscriptionModal');
    const closeModal = document.getElementById('closeModal');
    const backToPlans = document.getElementById('backToPlans');
    const closeSuccess = document.getElementById('closeSuccess');
    const paymentButtons = document.querySelectorAll('.btn-payment');
    const paymentForm = document.getElementById('paymentForm');
    const cardForm = document.getElementById('cardForm');
    const subscriptionPlans = document.querySelector('.subscription-plans');
    const successMessage = document.getElementById('successMessage');
    const successMessage2 = document.getElementById('successMessage');
    const totalPriceEl = document.getElementById('totalPrice');
    const planNameEl = document.getElementById('planName');
    
    // State
    let selectedPlan = null;
    let selectedPrice = null;
    let selectedPlanName = null;

    // Open modal
    subscribeBtn?.addEventListener('click', () => {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    // Close modal
    closeModal?.addEventListener('click', closeModalHandler);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalHandler();
        }
    });

    function closeModalHandler() {
        modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        // Reset form
        resetModal();
    }

    // Plan selection
    paymentButtons.forEach(button => {
        button.addEventListener('click', () => {
            selectedPlan = button.getAttribute('data-plan');
            selectedPrice = button.getAttribute('data-price');
            selectedPlanName = button.closest('.plan').querySelector('h3').textContent;
            
            // Show payment form
            subscriptionPlans.style.display = 'none';
            paymentForm.classList.remove('hidden');
            
            // Update price display
            const priceFormatted = parseFloat(selectedPrice).toLocaleString('fr-FR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
            totalPriceEl.textContent = priceFormatted + ' €';
            planNameEl.textContent = 'Plan: ' + selectedPlanName;
        });
    });

    // Back to plans
    backToPlans?.addEventListener('click', () => {
        subscriptionPlans.style.display = 'grid';
        paymentForm.classList.add('hidden');
        cardForm.reset();
    });

    // Form submission
    cardForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get form data
        const cardholderName = document.getElementById('cardholderName').value;
        const cardNumber = document.getElementById('cardNumber').value;
        const expiryDate = document.getElementById('expiryDate').value;
        const cvv = document.getElementById('cvv').value;
        const email = document.getElementById('email').value;

        // Basic validation
        if (!validateCardNumber(cardNumber)) {
            showError('Numéro de carte invalide');
            return;
        }

        if (!validateExpiryDate(expiryDate)) {
            showError('Date d\'expiration invalide (MM/YY)');
            return;
        }

        if (!validateCVV(cvv)) {
            showError('CVV invalide');
            return;
        }

        // Simulate payment processing
        processPayment(cardholderName, cardNumber, expiryDate, cvv, email);
    });

    // Card number formatting
    document.getElementById('cardNumber')?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\s/g, '');
        let formattedValue = '';
        for (let i = 0; i < value.length; i++) {
            if (i > 0 && i % 4 === 0) formattedValue += ' ';
            formattedValue += value[i];
        }
        e.target.value = formattedValue;
    });

    // Expiry date formatting
    document.getElementById('expiryDate')?.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.slice(0, 2) + '/' + value.slice(2, 4);
        }
        e.target.value = value;
    });

    // CVV only numbers
    document.getElementById('cvv')?.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
    });

    // Validation functions
    function validateCardNumber(cardNumber) {
        // Simple validation - just check if it has 16 digits
        const cleanNumber = cardNumber.replace(/\s/g, '');
        return /^\d{16}$/.test(cleanNumber);
    }

    function validateExpiryDate(date) {
        return /^\d{2}\/\d{2}$/.test(date);
    }

    function validateCVV(cvv) {
        return /^\d{3,4}$/.test(cvv);
    }

    // Payment processing
    function processPayment(name, cardNumber, expiry, cvv, email) {
        // Show loading state
        const submitBtn = cardForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Traitement...';
        submitBtn.disabled = true;

        // Simulate API call
        setTimeout(() => {
            // Hide payment form
            paymentForm.classList.add('hidden');
            
            // Show success message
            successMessage.classList.remove('hidden');
            
            // Log subscription info (in a real app, this would be sent to a server)
            console.log('Paiement réussi:', {
                plan: selectedPlan,
                planName: selectedPlanName,
                amount: selectedPrice,
                cardholderName: name,
                email: email,
                timestamp: new Date().toISOString()
            });

            // Store subscription in localStorage
            const subscription = {
                plan: selectedPlan,
                planName: selectedPlanName,
                amount: selectedPrice,
                email: email,
                subscribedAt: new Date().toISOString(),
                status: 'active'
            };
            localStorage.setItem('groupie_subscription', JSON.stringify(subscription));

            // Reset button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }, 2000);
    }

    // Close success message
    closeSuccess?.addEventListener('click', closeModalHandler);

    // Error handling
    function showError(message) {
        alert(message);
    }

    // Reset modal state
    function resetModal() {
        subscriptionPlans.style.display = 'grid';
        paymentForm.classList.add('hidden');
        successMessage.classList.add('hidden');
        cardForm.reset();
        selectedPlan = null;
        selectedPrice = null;
        selectedPlanName = null;
    }

    // Check if user is already subscribed
    function checkSubscriptionStatus() {
        const subscription = localStorage.getItem('groupie_subscription');
        if (subscription) {
            const data = JSON.parse(subscription);
            console.log('Utilisateur abonné:', data);
            // You can update UI based on subscription status here
        }
    }

    // Initialize on load
    document.addEventListener('DOMContentLoaded', checkSubscriptionStatus);
})();
