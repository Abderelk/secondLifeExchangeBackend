import mongoose, { Schema, Document, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser {
  // Informations de base
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;

  // Localisation
  address?: {
    street?: string;
    city: string;
    postalCode: string;
    country: string;
  };

  // Préférences
  interests: string[]; // Catégories d'intérêt (vêtements, électronique, livres, etc.)
  bio?: string;
  avatar?: string;

  // Statistiques
  impactScore: number; // Score d'impact écologique
  totalExchanges: number;
  totalObjectsShared: number;

  // Paramètres
  notifications: {
    email: boolean;
    weeklyTheme: boolean;
    newMessages: boolean;
    exchangeUpdates: boolean;
  };

  // Système
  role: 'user' | 'admin' | 'moderator';
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Réinitialisation mot de passe
  passwordResetToken?: string;
  passwordResetExpires?: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

interface IUserModel extends Model<IUserDocument> { }

const UserSchema = new Schema<IUserDocument, IUserModel>({
  // Informations de base
  firstName: {
    type: String,
    required: [true, 'Le prénom est requis'],
    trim: true,
    maxlength: [50, 'Le prénom ne peut pas dépasser 50 caractères']
  },
  lastName: {
    type: String,
    required: [true, 'Le nom est requis'],
    trim: true,
    maxlength: [50, 'Le nom ne peut pas dépasser 50 caractères']
  },
  email: {
    type: String,
    required: [true, "L'email est requis"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide']
  },
  password: {
    type: String,
    required: [true, 'Le mot de passe est requis'],
    minlength: [6, 'Le mot de passe doit contenir au moins 6 caractères']
  },
  phone: {
    type: String,
    trim: true
  },

  // Localisation
  address: {
    street: String,
    city: {
      type: String,
      required: [true, 'La ville est requise']
    },
    postalCode: {
      type: String,
      required: [true, 'Le code postal est requis']
    },
    country: {
      type: String,
      default: 'France'
    }
  },

  // Préférences
  interests: {
    type: [String],
    enum: [
      'vêtements',
      'électronique',
      'livres',
      'meubles',
      'décoration',
      'jouets',
      'sport',
      'outils',
      'cuisine',
      'jardin',
      'multimédia',
      'autre'
    ],
    default: []
  },
  bio: {
    type: String,
    maxlength: [500, 'La bio ne peut pas dépasser 500 caractères']
  },
  avatar: {
    type: String,
    default: ''
  },

  // Statistiques
  impactScore: {
    type: Number,
    default: 0
  },
  totalExchanges: {
    type: Number,
    default: 0
  },
  totalObjectsShared: {
    type: Number,
    default: 0
  },

  // Paramètres
  notifications: {
    email: {
      type: Boolean,
      default: true
    },
    weeklyTheme: {
      type: Boolean,
      default: true
    },
    newMessages: {
      type: Boolean,
      default: true
    },
    exchangeUpdates: {
      type: Boolean,
      default: true
    }
  },

  // Système
  role: {
    type: String,
    enum: ['user', 'admin', 'moderator'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Réinitialisation mot de passe
  passwordResetToken: {
    type: String,
    default: undefined
  },
  passwordResetExpires: {
    type: Date,
    default: undefined
  }
}, {
  timestamps: true
});

// Hash le mot de passe avant de sauvegarder
UserSchema.pre<IUserDocument>('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Méthode pour comparer les mots de passe
UserSchema.methods.comparePassword = async function (
  this: IUserDocument,
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUserDocument, IUserModel>('User', UserSchema);

export default User;