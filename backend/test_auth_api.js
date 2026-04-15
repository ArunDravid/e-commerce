const API_BASE = 'http://localhost:3005/api';

async function testAuth() {
    const testUser = {
        username: 'testuser_' + Date.now(),
        email: 'test' + Date.now() + '@example.com',
        password: 'password123'
    };

    console.log('--- Testing Registration ---');
    try {
        const regRes = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        const regData = await regRes.json();
        if (!regRes.ok) throw new Error(regData.error || 'Registration failed');
        console.log('Registration Success:', regData);
    } catch (err) {
        console.error('Registration Failed:', err.message);
        return;
    }

    console.log('\n--- Testing Login ---');
    try {
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: testUser.email,
                password: testUser.password
            })
        });
        const loginData = await loginRes.json();
        if (!loginRes.ok) throw new Error(loginData.error || 'Login failed');
        console.log('Login Success:', loginData);
        if (loginData.token) {
            console.log('JWT Token received!');
        }
    } catch (err) {
        console.error('Login Failed:', err.message);
    }
}

testAuth();
