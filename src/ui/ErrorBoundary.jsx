import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{ direction: "rtl", fontFamily: "'Segoe UI', Tahoma, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8f5f1", padding: 20 }}>
        <div style={{ background: "#fff", borderRadius: 18, padding: "32px 28px", maxWidth: 440, width: "100%", boxShadow: "0 4px 24px rgba(0,0,0,0.1)", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h2 style={{ color: "#1a3a4a", fontSize: 18, margin: "0 0 8px" }}>משהו השתבש</h2>
          <p style={{ color: "#888", fontSize: 13, margin: "0 0 16px" }}>האפליקציה נתקלה בשגיאה. ייתכן שנתונים שמורים פגומים.</p>
          <pre style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: 12, fontSize: 11, color: "#b91c1c", textAlign: "left", direction: "ltr", overflowX: "auto", maxHeight: 120, marginBottom: 16 }}>
            {this.state.error?.message || "Unknown error"}
          </pre>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => this.setState({ hasError: false, error: null })} style={{ background: "#2d8a6e", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              🔄 נסה שוב
            </button>
            <button onClick={() => { if (window.confirm("למחוק את כל הנתונים השמורים? פעולה זו בלתי הפיכה.")) { localStorage.clear(); window.location.reload(); } }} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              🗑️ אפס נתונים
            </button>
          </div>
        </div>
      </div>
    );
  }
}
