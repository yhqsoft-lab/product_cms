/** @type {import('tailwindcss').Config} */
module.exports = {

content: ["./src/**/*.{html,js,vue}"],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/line-clamp'), // ✅ 确保这行存在
    ],
}
