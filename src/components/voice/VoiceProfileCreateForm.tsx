"use client";

import { useState, type FormEvent } from "react";

/**
 * Relationship options shown in the dropdown.
 * "Someone else" maps to the `default` variant key in the V2 script.
 */
const RELATIONSHIP_OPTIONS = [
  { value: "daughter", label: "My daughter" },
  { value: "son", label: "My son" },
  { value: "spouse", label: "My spouse / partner" },
  { value: "grandchild", label: "My grandchild" },
  { value: "friend", label: "My friend" },
  { value: "parent", label: "My parent" },
  { value: "default", label: "Someone else" },
] as const;

type Props = {
  /** Pre-fill values from existing profile (for 2nd+ voice profile). */
  prefill?: {
    displayName?: string;
    city?: string;
    birthYear?: number;
  };
  /** Called with the new voiceProfileId on successful creation. */
  onCreated: (voiceProfileId: string) => void;
};

export function VoiceProfileCreateForm({ prefill, onCreated }: Props) {
  const [displayName, setDisplayName] = useState(prefill?.displayName ?? "");
  const [relationship, setRelationship] = useState("");
  const [city, setCity] = useState(prefill?.city ?? "");
  const [birthYear, setBirthYear] = useState(
    prefill?.birthYear?.toString() ?? ""
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side pre-validation (server validates authoritatively)
    if (!displayName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!relationship) {
      setError("Please select who this voice is for.");
      return;
    }
    if (!city.trim()) {
      setError("Please enter your city.");
      return;
    }
    const yearNum = Number(birthYear);
    if (!Number.isInteger(yearNum) || yearNum < 1900 || yearNum > 2025) {
      setError("Please enter a valid birth year (1900\u20132025).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/voice-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          relationship,
          city: city.trim(),
          birthYear: yearNum,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }

      onCreated(data.voiceProfileId);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 420 }}>
      <h2 style={{ marginBottom: 4 }}>Set Up Your Voice</h2>
      <p style={{ marginBottom: 20, color: "#666", fontSize: 14 }}>
        We use this info to personalize your training script. It only takes a
        moment.
      </p>

      {/* Display name */}
      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
          Your name
        </span>
        <input
          type="text"
          required
          maxLength={200}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How should we address you?"
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 15,
          }}
        />
      </label>

      {/* Relationship */}
      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
          Who is this voice for?
        </span>
        <select
          required
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 15,
          }}
        >
          <option value="" disabled>
            Select\u2026
          </option>
          {RELATIONSHIP_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {/* City */}
      <label style={{ display: "block", marginBottom: 16 }}>
        <span style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
          Your city
        </span>
        <input
          type="text"
          required
          maxLength={200}
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="e.g. Austin, Chicago, London"
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 15,
          }}
        />
      </label>

      {/* Birth year */}
      <label style={{ display: "block", marginBottom: 20 }}>
        <span style={{ display: "block", fontWeight: 500, marginBottom: 4 }}>
          Your birth year
        </span>
        <input
          type="number"
          required
          min={1900}
          max={2025}
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value)}
          placeholder="e.g. 1965"
          style={{
            width: 120,
            padding: "8px 10px",
            borderRadius: 6,
            border: "1px solid #ccc",
            fontSize: 15,
          }}
        />
      </label>

      {error && (
        <p
          role="alert"
          style={{ color: "var(--color-error, #c00)", marginBottom: 12 }}
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        style={{
          padding: "10px 24px",
          borderRadius: 6,
          border: "none",
          background: "#111",
          color: "#fff",
          fontSize: 15,
          fontWeight: 500,
          cursor: submitting ? "wait" : "pointer",
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? "Creating\u2026" : "Start Voice Training"}
      </button>
    </form>
  );
}
