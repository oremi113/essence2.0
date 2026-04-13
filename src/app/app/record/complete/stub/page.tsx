export default function CheckoutStub() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#FBF8F4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <p
        style={{
          fontFamily: 'var(--font-display, serif)',
          fontSize: 24,
          color: '#1C1A18',
          textAlign: 'center',
          margin: 0,
        }}
      >
        Voice Vault coming soon.
        <br />
        <span
          style={{
            display: 'block',
            marginTop: 8,
            fontFamily: 'var(--font-body, sans-serif)',
            fontSize: 16,
            color: '#6B6B6B',
          }}
        >
          Session 7 will replace this stub.
        </span>
      </p>
    </main>
  );
}
