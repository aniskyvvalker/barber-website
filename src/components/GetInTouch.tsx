import { motion } from 'motion/react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import type { FormEvent } from 'react';

const inputClass =
  'bg-white/10 border border-white/20 text-white focus:border-white/40 focus:ring-0 bg-black/60 transition-all duration-300 ease-in-out';

const textareaClass =
  'resize-none bg-black/60 border border-white/25 text-white focus:border-white/40 focus:ring-0 transition-all duration-300 ease-in-out';

export function GetInTouch() {
  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // no-op for now
  }

  return (
    <section
      id="getintouch"
      className="relative py-20 bg-black/70 text-white overflow-hidden"
    >
      {/* Background image with optimized zoom animation */}
      <motion.div
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{
          backgroundImage:
            "url('src/images/GetInTouchImage.png')",
          willChange: 'transform',
        }}
        animate={{
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25,
          ease: [0.4, 0, 0.6, 1],
          repeat: Infinity,
          repeatType: "reverse"
        }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative mx-auto px-4 max-w-5xl z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <p className="uppercase tracking-widest text-sm text-accent/80 mb-2">
            Imperialcut
          </p>
          <h2
            className="text-4xl md:text-5xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Get In Touch
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          <Card className="bg-black/0 border border-white/10 shadow-xl">
            <CardContent className="pt-8">
                
              <form onSubmit={onSubmit} className="space-y-6 text-white">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="name"
                      className="text-xs tracking-widest"
                    >
                      Your Name
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Enter your name"
                      required
                      className={inputClass}
                      minLength={2}
                      maxLength={50}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-xs tracking-widest"
                      >
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        pattern="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*\.[a-zA-Z0-9.-]*[a-zA-Z]{2,}$"
                        title="Please enter a valid email address."
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="phone"
                        className="text-xs tracking-widest"
                      >
                        Phone
                      </Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel"
                        placeholder="05 51 23 45 67"
                        pattern="^(05|06|07)(?:\s?[0-9]{2}){4}$"
                        title="Please enter a valid phone number."
                        className={inputClass}
                        maxLength={14}
                        onInput={(e) => {
                          const el = e.currentTarget;
                          const prevPos = el.selectionStart ?? el.value.length;
                          const raw = el.value;
                          // Count digits before caret
                          const digitsBefore = raw.slice(0, prevPos).replace(/\D/g, '').length;

                          // Digits only, cap to 10, then format as 'XX XX XX XX XX'
                          const digits = raw.replace(/\D/g, '').slice(0, 10);
                          const groups = digits.match(/.{1,2}/g) || [];
                          const formatted = groups.join(' ');
                          el.value = formatted;

                          // Restore caret position mapped from digit index
                          const caret = digitsBefore + Math.max(0, Math.floor((digitsBefore - 1) / 2));
                          requestAnimationFrame(() => el.setSelectionRange(caret, caret));
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Backspace') return;
                          const el = e.currentTarget;
                          const pos = el.selectionStart ?? el.value.length;
                          const raw = el.value;
                          if (pos > 0 && raw[pos - 1] === ' ') {
                            e.preventDefault();
                            const allDigits = raw.replace(/\D/g, '').slice(0, 10);
                            const digitsBefore = raw.slice(0, pos).replace(/\D/g, '').length;
                            if (digitsBefore > 0) {
                              const newDigits = (allDigits.slice(0, digitsBefore - 1) + allDigits.slice(digitsBefore)).slice(0, 10);
                              const groups = newDigits.match(/.{1,2}/g) || [];
                              const formatted = groups.join(' ');
                              el.value = formatted;
                              const caretDigits = digitsBefore - 1;
                              const caret = caretDigits + Math.max(0, Math.floor((caretDigits - 1) / 2));
                              requestAnimationFrame(() => el.setSelectionRange(caret, caret));
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="message"
                      className="text-xs tracking-widest"
                    >
                      Message
                    </Label>
                    <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us how we can help"
                    rows={3}
                    required
                    minLength={3}
                    maxLength={500}
                    className={textareaClass}
                    style={{ resize: 'none' }}
                    />
                  </div>
                </div>
                <div className="flex justify-center" style={{ marginTop: '48px' }}>
                  <Button
                    type="submit"
                    size="lg"
                    className="ic-cta text-white px-8 py-6 rounded-[6px]"
                  >
                    Send Message
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    <style>{`
    #getintouch input::placeholder,
    #getintouch textarea::placeholder {
        color: #5F594E !important;
    }
    /* Unify text selection highlight for inputs and textarea */
    #getintouch input::selection,
    #getintouch textarea::selection {
        background-color: rgba(255, 255, 255, 0.25) !important;
        color: inherit;
    }
    #getintouch input::-moz-selection,
    #getintouch textarea::-moz-selection {
        background-color: rgba(255, 255, 255, 0.25) !important;
        color: inherit;
    }
    
    #getintouch input,
    #getintouch textarea {
        border-color: rgba(255, 255, 255, 0.1) !important;
    }

    /* Only apply hover on devices that can hover (desktops with mouse) */
    @media (hover: hover) {
        #getintouch input:hover,
        #getintouch textarea:hover {
        border-color: rgba(255, 255, 255, 0.25) !important;
        }
    }
    
    #getintouch input:focus,
    #getintouch textarea:focus {
        border-color: rgba(255, 255, 255, 0.25) !important;
    }
    /* CTA color override */
    #getintouch .ic-cta { background-color: #4A3B27 !important; }
    @media (hover: hover) {
      #getintouch .ic-cta:hover { filter: brightness(0.9); }
    }
    `}</style>
    </section>
  );
}
