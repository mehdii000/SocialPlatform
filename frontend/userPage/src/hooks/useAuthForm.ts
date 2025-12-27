import { useState, ChangeEvent, FormEvent } from 'react';
import { z } from 'zod';

interface UseAuthFormOptions<T extends Record<string, string>> {
  initialValues: T;
  schema: z.ZodSchema;
  onSubmit: (values: T) => Promise<void>;
}

interface UseAuthFormReturn<T extends Record<string, string>> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  isSubmitting: boolean;
  handleChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: FormEvent) => Promise<void>;
  setFieldValue: (field: keyof T, value: string) => void;
  resetForm: () => void;
}

export function useAuthForm<T extends Record<string, string>>({
  initialValues,
  schema,
  onSubmit,
}: UseAuthFormOptions<T>): UseAuthFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name as keyof T]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const setFieldValue = (field: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    try {
      schema.parse(values);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Partial<Record<keyof T, string>> = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as keyof T;
          if (!newErrors[field]) {
            newErrors[field] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  };

  return {
    values,
    errors,
    isSubmitting,
    handleChange,
    handleSubmit,
    setFieldValue,
    resetForm,
  };
}
