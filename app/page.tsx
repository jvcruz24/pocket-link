'use client';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

const urlSchema = z.object({
  url: z.url('Please enter a valid URL'),
});

type UrlFormData = z.infer<typeof urlSchema>;

export default function Home() {
  const [shortLink, setShortLink] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

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
    } catch (error: unknown) {
      throw new Error(`Failed to shorten link', error ${error}`);
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
          </div>
        )}
      </main>
    </div>
  );
}
