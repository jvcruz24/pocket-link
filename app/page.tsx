'use client';
import Image from 'next/image';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { urlSchema, UrlFormData } from '@/lib/schema';
import { generateQRCode } from '@/lib/qr';

export default function Home() {
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UrlFormData>({
    resolver: zodResolver(urlSchema),
  });

  const onSubmit = async (data: UrlFormData) => {
    console.log('Data: ', data);

    try {
      const response = await fetch('/api/shorten', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        // fallback if the server sent something unexpected
        throw new Error('Unknown server error');
      }

      const result = await response.json();

      setShortLink(`${process.env.NEXT_PUBLIC_SITE_URL}/${result.short_code}`);

      console.log(result);
    } catch {
      setFormError('Something went wrong. Please try again.');
    }
  };

  // --- Copy Function ---
  const handleCopy = async () => {
    if (!shortLink) return;

    try {
      await navigator.clipboard.writeText(shortLink);
      setCopied(true);
      // Reset icon back to 'Copy' after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleGenerateQR = async (url: string) => {
    const dataUrl = await generateQRCode(url);
    setQrUrl(dataUrl);
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black'>
      <main className='flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-white dark:bg-black sm:items-start'>
        <form
          className='w-full flex flex-row items-stretch gap-4'
          onSubmit={handleSubmit(onSubmit)}
        >
          <input
            {...register('url')}
            type='text'
            placeholder='Insert the URL here to shorten it'
            className='w-full flex-8 rounded-md border-2 border-gray-300 bg-transparent px-4 py-2 text-lg focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:focus:border-blue-400'
          />
          <button className='flex-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md cursor-pointer'>
            Shorten URL
          </button>
        </form>
        {errors.url && <p className='text-red-500'>{errors.url.message}</p>}
        {formError && <p className='text-red-500'>{formError}</p>}
        {shortLink && (
          <div className='mt-6 p-4 border border-zinc-200 dark:border-zinc-800 rounded-lg w-full'>
            <p className='text-sm text-zinc-500 mb-1'>Shortened URL:</p>
            <div className='flex items-center justify-between gap-4'>
              <a
                href={shortLink}
                target='_blank'
                rel='noopener noreferrer'
                className='underline text-blue-500 break-all'
              >
                {shortLink}
              </a>

              {/* Toggle between Copy and Check icon */}
              <button
                onClick={handleCopy}
                className='p-2 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-md transition-colors'
                title='Copy to clipboard'
              >
                {copied ? (
                  <Check
                    size={18}
                    className='text-green-500'
                  />
                ) : (
                  <Copy
                    size={18}
                    className='text-zinc-500'
                  />
                )}
              </button>
            </div>
            {/* The QR Image */}
            {qrUrl && (
              <Image
                width={300}
                height={100}
                src={qrUrl}
                alt='QR Code'
                className='w-40 h-40 shadow-md'
              />
            )}

            <div className='flex gap-2'>
              <button
                onClick={() => handleGenerateQR(shortLink)}
                className='bg-gray-200 px-4 py-2 rounded'
              >
                Generate QR
              </button>

              {qrUrl && (
                <a
                  href={qrUrl}
                  download='pocket-link-qr.png'
                  className='bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700'
                >
                  Download QR
                </a>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
