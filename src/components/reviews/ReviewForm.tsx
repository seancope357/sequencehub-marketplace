'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { StarRating } from './StarRating';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const reviewFormSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  title: z.string().max(100, 'Title must be 100 characters or less').optional(),
  comment: z.string().max(1000, 'Comment must be 1000 characters or less').optional(),
});

type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export interface Review {
  id: string;
  rating: number;
  title?: string;
  comment?: string;
}

export interface ReviewFormProps {
  productId: string;
  existingReview?: Review;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReviewForm({
  productId,
  existingReview,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: existingReview?.rating ?? 0,
      title: existingReview?.title ?? '',
      comment: existingReview?.comment ?? '',
    },
  });

  const onSubmit = async (values: ReviewFormValues) => {
    setIsSubmitting(true);

    try {
      let response;

      if (existingReview) {
        // Update existing review
        response = await fetch(`/api/reviews/${existingReview.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });
      } else {
        // Create new review
        response = await fetch(`/api/products/${productId}/reviews`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(values),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit review');
      }

      toast({
        title: existingReview ? 'Review Updated' : 'Review Submitted',
        description: existingReview
          ? 'Your review has been updated successfully.'
          : 'Thank you for your review!',
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error('Review submission error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to submit review',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Rating Field */}
        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rating</FormLabel>
              <FormControl>
                <StarRating
                  rating={field.value}
                  onChange={field.onChange}
                  size="lg"
                  readonly={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Title Field */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Review Title (Optional)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Summarize your experience"
                  maxLength={100}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/100 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Comment Field */}
        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Review (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your thoughts about this sequence..."
                  maxLength={1000}
                  rows={5}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {field.value?.length || 0}/1000 characters
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>{existingReview ? 'Update Review' : 'Submit Review'}</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
