const response = await fetch('http://localhost:5080/generar-qr', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        enterpriseName: 'enterprises/LC03oconv8',
        policyName: 'policy_empty'
    })
});

const data = await response.json();
const match = data.data.qrCode.match(/ENROLLMENT_TOKEN":"([A-Z]{20})"/);
const token = match ? match[1] : 'ERROR';
console.log('\n🔑 NUEVO TOKEN (20 caracteres):', token, '\n');
