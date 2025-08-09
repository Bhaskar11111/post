const cookieParser = require('cookie-parser')
const express=require('express')
const bcrypt=require('bcrypt')
const userModel=require('./models/user')
const postModel=require('./models/post')
const path=require('path')
const jwt=require('jsonwebtoken')
const app=express()

app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use(cookieParser())
app.use(express.static(path.join(__dirname,'public')))
app.set('view engine','ejs')

app.get('/',(req,res)=>
{
    // console.log(req.user);
    res.render('index')

})


app.get('/profile', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate('posts');
    res.render('profile', { user });
});
app.post('/profile', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate('posts');
    res.render('profile', { user });
});


app.post('/register',async (req,res)=>
{

    let {name,username,password,email,age}=req.body
    
    let userEmail=await userModel.findOne({email})
    if(userEmail) return res.status(500).send('Email already registered')
    else
    {
        bcrypt.genSalt(10, (err,salt)=>
        {
            bcrypt.hash(password, salt, async(err,hash)=>
            {
                let user=await userModel.create({
                    name,
                    username,
                    password:hash,
                    email,
                    age
                })
                let token=jwt.sign({email:email, userid: user._id},'3u45')
                res.cookie('token',token)
                res.redirect('/profile')
            })
        })
    }
    
})
app.get('/register',async (req,res)=>
{

   
    res.redirect('/')
               
})

app.get('/login',(req,res)=>
{
    res.render('login')
})
app.post('/login',async(req,res)=>
{
   let{email,password}=req.body
   let user=await userModel.findOne({email})
   if(!user) return res.status(200).send('an error occured')
   bcrypt.compare(password,user.password,(err,result)=>
   {
    if(result)
    {
        let token=jwt.sign({email:email, userid:user._id},'3u45')
        res.cookie('token',token)
        return res.redirect('/profile')

    } 
    else
    {
        res.redirect('/login')
    } 
        
   })
})

app.get('/logout',(req,res)=>
{
    res.cookie('token','')
    res.redirect('/')
})


function isLoggedIn (req,res,next){

    {
        if(req.cookies.token==='') return res.redirect('/login')
    else{
        let data=jwt.verify(req.cookies.token,'3u45',)
        req.user=data
    }
    next()
}

}

app.post('/post', isLoggedIn,async(req,res)=>
{
    let user=await userModel.findOne({email:req.user.email})

    let{content}=req.body
    let post= await postModel.create({
        user:user._id,
        content 
    })
    user.posts.push(post._id)
    await user.save()
    res.redirect('/profile')
  

})

app.get('/like/:id',isLoggedIn, async(req,res)=>
{
    let post=await postModel.findOne({_id:req.params.id}).populate('user')
    
    if(!post) return res.status(500).send('no post found')

    if(post.likes.indexOf(req.user.userid)===-1)
    {

        post.likes.push(req.user.userid)
    }
   else{
    post.likes.splice(post.likes.indexOf(req.user.userid),1)
   }
    await post.save()
    res.redirect('/profile')
})

app.get('/edit/:id' ,isLoggedIn,async(req,res)=>
{
   let post=await postModel.findOne({_id:req.params.id}).populate('user')
    res.render('edit',{post})
})

app.post('/update/:id',async (req,res)=>
{
    let post=await postModel.findOneAndUpdate({_id:req.params.id},{content:req.body.content})
    res.redirect('/profile')
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
 