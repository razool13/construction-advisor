import React from 'react';

export const formatMsg = (text) =>
  text.split("\n").map((line, i) => {
    if (line.startsWith("### ")) return <h4 key={i} style={{ margin: "10px 0 4px", fontSize: "14.5px", fontWeight: 700, color: "#1a3a4a" }}>{line.slice(4)}</h4>;
    if (line.startsWith("## ")) return <h3 key={i} style={{ margin: "12px 0 6px", fontSize: "15.5px", fontWeight: 700, color: "#1a3a4a" }}>{line.slice(3)}</h3>;
    if (line.startsWith("# ")) return <h2 key={i} style={{ margin: "14px 0 6px", fontSize: "17px", fontWeight: 700, color: "#1a3a4a" }}>{line.slice(2)}</h2>;
    const parts = line.split(/\*\*(.*?)\*\*/g).map((p, j) => (j % 2 === 1 ? <strong key={j}>{p}</strong> : p));
    if (line.startsWith("- ") || line.startsWith("• ")) return <div key={i} style={{ paddingRight: "14px", margin: "2px 0", display: "flex", gap: "5px" }}><span style={{ color: "#2d8a6e" }}>•</span><span>{parts}</span></div>;
    if (/^\d+[\.\)]/.test(line)) return <div key={i} style={{ paddingRight: "14px", margin: "2px 0" }}>{parts}</div>;
    if (line.trim() === "") return <div key={i} style={{ height: "6px" }} />;
    return <p key={i} style={{ margin: "3px 0", lineHeight: 1.65 }}>{parts}</p>;
  });
