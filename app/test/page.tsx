export default function TestPage() {
    return (
        <div style={{ padding: '50px', fontFamily: 'sans-serif' }}>
            <h1>✅ Le serveur fonctionne !</h1>
            <p>Si vous voyez cette page, le problème vient des autres routes ou de l'authentification.</p>
            <hr />
            <p>Heure du test : {new Date().toLocaleTimeString()}</p>
        </div>
    );
}
