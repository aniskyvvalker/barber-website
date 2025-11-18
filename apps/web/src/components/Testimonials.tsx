import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { Card, CardContent } from './ui/card';

const testimonials = [
  {
    name: 'Mostafa Hamed',
    rating: 5,
    text: 'Excellent service — never disappointed. I’ve been getting my hair cut there for two years. Bob is the best barber in the place.',
  },
  {
    name: 'Guendouz Habib',
    rating: 5,
    text: 'Honestly, nothing to say — an excellent hairdresser! Very welcoming, with a wonderful atmosphere. The barber is always attentive.',
  },
  {
    name: 'Ryan Parker',
    rating: 5,
    text: 'Outstanding service from start to finish. The team is friendly, skilled, and really listens to what you want. Highly recommend!',
  },
  {
    name: 'K. I.',
    rating: 5,
    text: "I visited without an appointment and asked for a haircut for my son. The staff listened patiently to my requests with a smile, and I could feel their professionalism. I’m very grateful — thank you so much! My son and wife are very happy.",
  },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            What Our Clients Say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Don't just take our word for it — hear from our satisfied clients.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5" color="#c4a460" fill="#c4a460" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-4 italic">
                    “{testimonial.text}”
                  </p>
                  <p className="text-sm">— {testimonial.name}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
