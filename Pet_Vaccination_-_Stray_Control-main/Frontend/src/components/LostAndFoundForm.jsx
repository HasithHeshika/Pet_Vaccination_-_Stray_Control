import React, { useState } from 'react';
import * as yup from 'yup';

const schema = yup.object().shape({
    petName: yup.string().required(),
    petType: yup.string().required(),
    description: yup.string().required(),
    location: yup.string().required(),
    contactInfo: yup.string().matches(/^[0-9]{10}$/)
});

export default function LostAndFoundForm() {
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await schema.validate(formData, { abortEarly: false });

            await fetch('/api/lost-and-found', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            alert('Submitted');
        } catch (err) {
            let eObj = {};
            err.inner.forEach(e => eObj[e.path] = e.message);
            setErrors(eObj);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input name="petName" onChange={handleChange} />
            {errors.petName && <p>{errors.petName}</p>}

            <input name="petType" onChange={handleChange} />
            <textarea name="description" onChange={handleChange} />
            <input name="location" onChange={handleChange} />
            <input name="contactInfo" onChange={handleChange} />

            <button type="submit">Submit</button>
        </form>
    );
}
