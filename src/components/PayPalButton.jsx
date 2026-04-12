import React, { useEffect, useRef } from 'react';

export default function PayPalButton({ amount = '4.99', currency = 'EUR', onSuccess = () => {}, metadata = {} }) {
  const ref = useRef(null);

  useEffect(() => {
    const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
    const env = import.meta.env.VITE_PAYPAL_ENV || 'sandbox';
    const serverBase = import.meta.env.VITE_PAYPAL_SERVER_URL || '';
    if (!clientId) return;

    const existing = document.getElementById('paypal-sdk');
    if (!existing) {
      const s = document.createElement('script');
      s.id = 'paypal-sdk';
      s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}` + (env === 'sandbox' ? '&intent=capture' : '');
      s.async = true;
      document.body.appendChild(s);
      s.onload = renderButton;
    } else {
      renderButton();
    }

    async function renderButton() {
      if (!window.paypal || !ref.current) return;
      window.paypal.Buttons({
        createOrder: async (data, actions) => {
          // Create order on server with metadata
          const res = await fetch(`${serverBase}/create-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: parseFloat(amount), currency, metadata })
          }).then(r => r.json());
          // server returns order object
          return res.id || res && res.result && res.result.id;
        },
        onApprove: async (data, actions) => {
          // Capture via server for verification
          const capture = await fetch(`${serverBase}/capture-order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId: data.orderID })
          }).then(r => r.json());
          onSuccess(capture);
        }
      }).render(ref.current);
    }

    return () => {
      if (ref.current) ref.current.innerHTML = '';
    };
  }, [amount, currency, onSuccess]);

  return <div ref={ref} />;
}
