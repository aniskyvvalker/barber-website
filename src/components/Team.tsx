import { motion } from 'motion/react';
import { ImageWithFallback } from './figma/ImageWithFallback';

const team = [
  {
    name: 'Marcus Chen',
    specialization: 'Master Barber & Founder',
    image: 'https://images.unsplash.com/photo-1747832512459-5566e6d0ee5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBiYXJiZXIlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NjAzNjE4OTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    bio: 'With 15 years of experience, Marcus specializes in classic cuts and modern fades. Trained in London and Tokyo.',
  },
  {
    name: 'Jordan Williams',
    specialization: 'Senior Stylist',
    image: 'https://images.unsplash.com/photo-1648313143880-52cfd6216038?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZW4lMjBoYWlyY3V0JTIwc3R5bGluZ3xlbnwxfHx8fDE3NjAzNjI3MDl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    bio: 'Expert in beard grooming and precision fades. Jordan brings contemporary techniques with old-school attention to detail.',
  },
  {
    name: 'Alex Rivera',
    specialization: 'Grooming Specialist',
    image: 'https://images.unsplash.com/photo-1603899968034-1a56ca48d172?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiZWFyZCUyMHRyaW0lMjBncm9vbWluZ3xlbnwxfHx8fDE3NjAyNzAxMjF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    bio: 'Specializing in traditional hot towel shaves and facial treatments. Alex believes grooming is an art form.',
  },
];

export function Team() {
  return (
    <section id="team" className="py-20 bg-card">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Meet Our Team
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Our skilled barbers are dedicated to delivering exceptional service and craftsmanship.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {team.map((member, index) => (
            <motion.div
              key={member.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="text-center group"
            >
              <div className="relative mb-6 overflow-hidden rounded-full w-48 h-48 mx-auto">
                <ImageWithFallback
                  src={member.image}
                  alt={member.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <h3 className="text-2xl mb-2">{member.name}</h3>
              <p className="text-accent mb-3">{member.specialization}</p>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                {member.bio}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
