'use client';
// The "Old Way" - React + useState
import { useState } from 'react';

export default function OldForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {},
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string } = {};

    // Manual Validation Logic (Tedious & Error-prone)
    if (!email.includes('@')) newErrors.email = 'Invalid email';
    if (password.length < 8) newErrors.password = 'Password too short';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
    } else {
      console.log('Submitting:', { email, password });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder='Email'
      />
      {errors.email && <span>{errors.email}</span>}

      <input
        type='password'
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder='Password'
      />
      {errors.password && <span>{errors.password}</span>}

      <button type='submit'>Submit</button>
    </form>
  );
}
