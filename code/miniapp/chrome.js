export const createChrome = () => {
    const chrome = document.getElementById('chrome');
    const main = document.getElementById('MainButton');
    const secondary = document.getElementById('SecondaryButton');
    const back = document.getElementById('BackButton');
    const idle = () => main.hidden && secondary.hidden && back.hidden;
    const bind = el => ({
        setText: text => {
            el.textContent = text;
            if (el.id === 'MainButton') el.classList.toggle('ring', text === 'LIVE NEWS' && back.hidden);
        },
        show: () => { el.hidden = false; chrome.hidden = false; },
        hide: () => {
            el.hidden = true;
            chrome.hidden = idle();
        },
        onClick: fn => { el.onclick = fn; },
    });
    return {
        MainButton: bind(main),
        SecondaryButton: bind(secondary),
        BackButton: bind(back),
        HapticFeedback: { impactOccurred() {}, selectionChanged() {} },
        ready() {},
        expand() {},
        disableVerticalSwipes() {},
        setHeaderColor() {},
        setBackgroundColor() {},
    };
};
