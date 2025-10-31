document.addEventListener('DOMContentLoaded', () => {
    const discordId = prompt("Please enter your Discord ID to fetch your data:");
    if (discordId) {
        fetchUserData(discordId);
    }

    const tokenForm = document.getElementById('tokenForm');
    tokenForm.addEventListener('submit', handleTokenSubmit);
});

async function fetchUserData(discordId) {
    try {
        const response = await fetch(`/api/user/${discordId}`);
        const data = await response.json();

        if (data.user) {
            document.querySelector('.user-details p:nth-child(1)').textContent = data.user.email;
            document.querySelector('.user-details p:nth-child(2)').textContent = `Discord ID: ${data.user.discord_id}`;
        }

        const authStatus = document.querySelector('.auth-status');
        if (data.hasToken) {
            authStatus.textContent = 'Autenticado';
            authStatus.style.color = 'var(--primary-accent-color)';
        } else {
            authStatus.textContent = 'Não Autenticado';
            authStatus.style.color = '#B3B3B3';
        }

        const callButton = document.querySelector('.btn-entrar');
        if (data.inCall) {
            callButton.textContent = 'Em Call';
            callButton.disabled = true;
        } else {
            callButton.textContent = 'Entrar em Call';
            callButton.disabled = false;
        }
    } catch (error) {
        console.error('Error fetching user data:', error);
    }
}

async function handleTokenSubmit(event) {
    event.preventDefault();
    const discordId = document.getElementById('discordId').value;
    const userToken = document.getElementById('userToken').value;
    const email = document.getElementById('email').value;

    try {
        const response = await fetch('/api/auth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ discordId, userToken, email })
        });
        const result = await response.json();
        alert(result.message);
        if (result.success) {
            fetchUserData(discordId);
        }
    } catch (error) {
        console.error('Error submitting token:', error);
        alert('Error submitting token.');
    }
}

document.querySelector('.btn-entrar').addEventListener('click', async () => {
    const discordId = prompt("Enter your Discord ID:");
    const guildId = prompt("Enter the Guild ID:");
    const channelId = prompt("Enter the Channel ID:");

    if(discordId && guildId && channelId) {
        try {
            const response = await fetch('/api/voice/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ discordId, guildId, channelId })
            });
            const result = await response.json();
            alert(result.message);
            if (result.success) {
                fetchUserData(discordId);
            }
        } catch (error) {
            console.error('Error joining call:', error);
            alert('Error joining call.');
        }
    }
});
