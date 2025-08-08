document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.querySelector('.login-form');

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('http://localhost:3000/admin-auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const data = await response.json();

                if (!response.ok) {
                    alert(data.message);
                    return;
                }

                // Se o login for bem-sucedido:

                // 1. Armazena o token no navegador
                localStorage.setItem('authToken', data.token);

                // 2. Redireciona para a nova página de dashboard
                window.location.href = '/admin/dashboard-page';

            } catch (error) {
                alert('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
            }
        });
    }
});